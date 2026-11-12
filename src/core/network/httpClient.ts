/**
 * Client HTTP unique de l'app (R-NET-1…11).
 * Aucun log. Aucune adresse absolue. Auth par mode. Timeout via AbortController.
 */

import {resolveServiceUrl} from '../config/serviceRegistry';
import {getHttpAuthConfig} from './authProviders';
import {
  NetworkError,
  RequestAbortedError,
  TimeoutError,
} from './errors';
import {notifyRateLimited} from './rateLimitGate';
import {resolveAuthMode} from './serviceAuth';
import type {
  AuthMode,
  HttpResponse,
  PreparedRequest,
  RequestBody,
  RequestOptions,
  ServiceId,
} from './types';

/** Choix technique (pas une valeur du site) : délai max par défaut. */
export const DEFAULT_TIMEOUT_MS = 20_000;

const PROTECTED_HEADERS = new Set(['authorization', 'x-access-proof']);

function isAbsoluteUrl(path: string): boolean {
  return /^https?:\/\//i.test(path);
}

function isFormData(body: RequestBody | undefined): body is FormData {
  return typeof FormData !== 'undefined' && body instanceof FormData;
}

function buildQuery(
  query?: RequestOptions['query'],
): string {
  if (!query) {
    return '';
  }
  const parts: string[] = [];
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) {
      continue;
    }
    parts.push(
      `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
    );
  }
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

/**
 * Fusionne les en-têtes : auth imposée, en-têtes appelant filtrés
 * (Authorization / X-Access-Proof insensibles à la casse ne passent pas).
 */
function buildHeaders(
  service: ServiceId,
  auth: AuthMode,
  callerHeaders?: Record<string, string>,
  body?: RequestBody,
): Record<string, string> {
  const headers: Record<string, string> = {};

  if (!isFormData(body)) {
    headers['Content-Type'] = 'application/json';
  }

  if (callerHeaders) {
    for (const [key, value] of Object.entries(callerHeaders)) {
      if (PROTECTED_HEADERS.has(key.toLowerCase())) {
        continue;
      }
      headers[key] = value;
    }
  }

  const providers = getHttpAuthConfig();
  if (auth === 'bearer') {
    const token = providers.getBearerToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } else if (auth === 'accessProof') {
    const proof = providers.getAccessProof();
    if (proof) {
      headers['X-Access-Proof'] = proof;
    }
  }

  return headers;
}

function resolveUrl(service: ServiceId, path: string, query?: RequestOptions['query']): string {
  if (isAbsoluteUrl(path)) {
    throw new NetworkError('ABSOLUTE_URL_REFUSED');
  }
  const base = resolveServiceUrl(service, path);
  return `${base}${buildQuery(query)}`;
}

/**
 * Prépare url + headers sans appeler le réseau (lecteurs média étapes 5–6).
 */
export function prepareRequest(
  service: ServiceId,
  path: string,
  options: RequestOptions = {},
): PreparedRequest {
  const auth = resolveAuthMode(service, options.auth);
  const url = resolveUrl(service, path, options.query);
  const headers = buildHeaders(service, auth, options.headers, options.body);
  return {url, headers};
}

function combineSignals(
  timeoutMs: number,
  userSignal?: AbortSignal,
): {signal: AbortSignal; cleanup: () => void; wasTimeout: () => boolean} {
  const controller = new AbortController();
  let timedOut = false;

  const onUserAbort = () => {
    if (!controller.signal.aborted) {
      controller.abort();
    }
  };

  if (userSignal) {
    if (userSignal.aborted) {
      controller.abort();
    } else {
      userSignal.addEventListener('abort', onUserAbort, {once: true});
    }
  }

  const timer = setTimeout(() => {
    timedOut = true;
    if (!controller.signal.aborted) {
      controller.abort();
    }
  }, timeoutMs);

  const cleanup = () => {
    clearTimeout(timer);
    if (userSignal) {
      userSignal.removeEventListener('abort', onUserAbort);
    }
  };

  return {
    signal: controller.signal,
    cleanup,
    wasTimeout: () => timedOut,
  };
}

async function readBody(response: Response): Promise<{
  body: unknown | null;
  bodyKind: HttpResponse['bodyKind'];
}> {
  const text = await response.text();
  if (!text || text.trim() === '') {
    return {body: null, bodyKind: 'empty'};
  }
  try {
    return {body: JSON.parse(text), bodyKind: 'json'};
  } catch {
    return {body: null, bodyKind: 'invalid'};
  }
}

function extractRetryAfterSeconds(
  body: unknown,
  response: Response,
): number | null {
  const rec =
    body !== null && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;
  const dataRec =
    rec?.data !== null && typeof rec?.data === 'object' && !Array.isArray(rec?.data)
      ? (rec.data as Record<string, unknown>)
      : null;

  const fromBody = rec?.retryAfterSeconds ?? dataRec?.retryAfterSeconds;
  if (fromBody !== undefined && fromBody !== null) {
    const n = Number(fromBody);
    if (Number.isFinite(n) && n > 0) {
      return n;
    }
  }

  const header = response.headers.get('Retry-After');
  if (header) {
    const n = Number(header);
    if (Number.isFinite(n) && n > 0) {
      return n;
    }
  }

  return null;
}

async function request(
  service: ServiceId,
  method: string,
  path: string,
  options: RequestOptions = {},
): Promise<HttpResponse> {
  const auth = resolveAuthMode(service, options.auth);
  const url = resolveUrl(service, path, options.query);
  const headers = buildHeaders(service, auth, options.headers, options.body);

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const {signal, cleanup, wasTimeout} = combineSignals(
    timeoutMs,
    options.signal,
  );

  let fetchBody: BodyInit | undefined;
  if (options.body !== undefined && method !== 'GET') {
    if (isFormData(options.body)) {
      fetchBody = options.body;
    } else {
      fetchBody = JSON.stringify(options.body);
    }
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: fetchBody,
      signal,
    });
  } catch (err) {
    cleanup();
    if (wasTimeout()) {
      throw new TimeoutError();
    }
    if (
      options.signal?.aborted ||
      (err instanceof Error && err.name === 'AbortError')
    ) {
      throw new RequestAbortedError();
    }
    throw new NetworkError();
  }
  cleanup();

  const {body, bodyKind} = await readBody(response);

  const code =
    body !== null &&
    typeof body === 'object' &&
    !Array.isArray(body) &&
    typeof (body as Record<string, unknown>).code === 'string'
      ? ((body as Record<string, unknown>).code as string)
      : null;

  if (response.status === 429 || code === 'RATE_LIMITED') {
    const seconds = extractRetryAfterSeconds(body, response);
    notifyRateLimited(service, seconds);
  }

  if (response.status === 401 && auth !== 'none') {
    getHttpAuthConfig().onUnauthorized({
      service,
      status: 401,
      code,
      auth,
    });
  }

  return {
    status: response.status,
    ok: response.ok,
    body,
    bodyKind,
  };
}

export type ServiceClient = {
  get: (path: string, options?: RequestOptions) => Promise<HttpResponse>;
  post: (
    path: string,
    body?: RequestBody,
    options?: RequestOptions,
  ) => Promise<HttpResponse>;
  put: (
    path: string,
    body?: RequestBody,
    options?: RequestOptions,
  ) => Promise<HttpResponse>;
  patch: (
    path: string,
    body?: RequestBody,
    options?: RequestOptions,
  ) => Promise<HttpResponse>;
  delete: (path: string, options?: RequestOptions) => Promise<HttpResponse>;
  postForm: (
    path: string,
    formData: FormData,
    options?: RequestOptions,
  ) => Promise<HttpResponse>;
};

function createServiceClient(service: ServiceId): ServiceClient {
  return {
    get: (path, options) => request(service, 'GET', path, options),
    post: (path, body, options = {}) =>
      request(service, 'POST', path, {...options, body}),
    put: (path, body, options = {}) =>
      request(service, 'PUT', path, {...options, body}),
    patch: (path, body, options = {}) =>
      request(service, 'PATCH', path, {...options, body}),
    delete: (path, options) => request(service, 'DELETE', path, options),
    postForm: (path, formData, options = {}) =>
      request(service, 'POST', path, {...options, body: formData}),
  };
}

export const http = {
  service: (id: ServiceId): ServiceClient => createServiceClient(id),
};
