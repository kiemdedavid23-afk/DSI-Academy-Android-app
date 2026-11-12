/**
 * Enveloppe universelle des Workers Communauté / Boutique / Marketplace.
 * success n'est vrai que si le corps contient success === true (comme le site).
 */

import type {EnvelopeResult, HttpResponse} from './types';
import {
  NetworkError,
  RequestAbortedError,
  TimeoutError,
} from './errors';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

/**
 * Parse une HttpResponse en enveloppe métier.
 * Ne lance jamais.
 */
export function parseEnvelope(response: HttpResponse): EnvelopeResult {
  if (response.bodyKind !== 'json') {
    return {
      success: false,
      error: null,
      code: 'INVALID_RESPONSE',
      field: null,
      retryAfterSeconds: null,
      data: null,
      status: response.status,
    };
  }

  const payload = asRecord(response.body);
  const dataRec = asRecord(payload?.data);

  const retryRaw =
    payload?.retryAfterSeconds ?? dataRec?.retryAfterSeconds ?? null;
  const retryAfterSeconds =
    retryRaw === null || retryRaw === undefined
      ? null
      : Number(retryRaw);

  const fieldRaw = payload?.field ?? dataRec?.field ?? null;

  return {
    success: payload?.success === true,
    error: typeof payload?.error === 'string' ? payload.error : null,
    code: typeof payload?.code === 'string' ? payload.code : null,
    field: typeof fieldRaw === 'string' ? fieldRaw : null,
    retryAfterSeconds:
      retryAfterSeconds !== null && Number.isFinite(retryAfterSeconds)
        ? retryAfterSeconds
        : null,
    data: payload?.data ?? null,
    status: response.status,
  };
}

/**
 * Exécute une promesse HttpResponse et renvoie toujours une enveloppe.
 * Attrape NetworkError / TimeoutError / RequestAbortedError → code NETWORK_ERROR, status 0.
 */
export async function safeEnvelope(
  promise: Promise<HttpResponse>,
): Promise<EnvelopeResult> {
  try {
    const response = await promise;
    return parseEnvelope(response);
  } catch (err) {
    if (
      err instanceof NetworkError ||
      err instanceof TimeoutError ||
      err instanceof RequestAbortedError
    ) {
      return {
        success: false,
        error: null,
        code: 'NETWORK_ERROR',
        field: null,
        retryAfterSeconds: null,
        data: null,
        status: 0,
      };
    }
    return {
      success: false,
      error: null,
      code: 'NETWORK_ERROR',
      field: null,
      retryAfterSeconds: null,
      data: null,
      status: 0,
    };
  }
}
