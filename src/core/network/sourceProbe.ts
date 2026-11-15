/**
 * Sondage d'une source de fichier (adresse directe fournie par le Worker).
 * Seul fichier avec src/core/network qui appelle fetch hors client HTTP : les
 * adresses de sources sont absolues et refusées par le client HTTP (R-NET-1).
 *
 * Une requête Range 0-0 : en-têtes seulement, le corps n'est jamais lu et la
 * requête est coupée. Aucune adresse, aucun en-tête n'apparaît dans le résultat.
 */

export type ProbeFailureReason =
  | 'network'
  | 'timeout'
  | 'aborted'
  | 'rejected'
  | 'notFound'
  | 'rateLimited'
  | 'htmlPage'
  | 'server';

export type ProbeResult =
  | {
      kind: 'ok';
      status: number;
      contentType: string | null;
      totalBytes: number | null;
      rangeSupported: boolean;
    }
  | {kind: 'failure'; reason: ProbeFailureReason; status: number | null};

export const PROBE_TIMEOUT_MS = 15_000;

/** « bytes 0-0/12345 » → 12345 ; « bytes 0-0/* » → null. */
export function parseContentRangeTotal(header: string | null): number | null {
  if (!header) {
    return null;
  }
  const match = /^bytes\s+(?:\d+-\d+|\*)\/(\d+)$/i.exec(header.trim());
  return match ? Number(match[1]) : null;
}

function parseLength(header: string | null): number | null {
  if (!header || !/^\d+$/.test(header.trim())) {
    return null;
  }
  return Number(header.trim());
}

function cleanContentType(header: string | null): string | null {
  if (!header) {
    return null;
  }
  const type = header.split(';')[0].trim().toLowerCase();
  return type === '' ? null : type;
}

function fail(
  reason: ProbeFailureReason,
  status: number | null,
): ProbeResult {
  return {kind: 'failure', reason, status};
}

export async function probeSource(
  url: string,
  options: {signal?: AbortSignal; timeoutMs?: number} = {},
): Promise<ProbeResult> {
  const controller = new AbortController();
  let timedOut = false;
  const onUserAbort = () => controller.abort();
  if (options.signal) {
    if (options.signal.aborted) {
      return fail('aborted', null);
    }
    options.signal.addEventListener('abort', onUserAbort, {once: true});
  }
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.timeoutMs ?? PROBE_TIMEOUT_MS);

  const cleanup = () => {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', onUserAbort);
  };

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {Range: 'bytes=0-0'},
      signal: controller.signal,
    });
  } catch {
    cleanup();
    if (timedOut) {
      return fail('timeout', null);
    }
    if (options.signal?.aborted) {
      return fail('aborted', null);
    }
    return fail('network', null);
  }
  cleanup();

  const status = response.status;
  const contentType = cleanContentType(response.headers.get('Content-Type'));
  const contentRange = response.headers.get('Content-Range');
  const acceptRanges = response.headers.get('Accept-Ranges');
  const contentLength = parseLength(response.headers.get('Content-Length'));
  try {
    controller.abort();
  } catch {
    // Coupure du corps : sans effet si déjà terminé.
  }

  if (status === 401 || status === 403) {
    return fail('rejected', status);
  }
  if (status === 404 || status === 410) {
    return fail('notFound', status);
  }
  if (status === 429) {
    return fail('rateLimited', status);
  }
  if (status !== 200 && status !== 206) {
    return fail('server', status);
  }
  // Une page web à la place du fichier (confirmation ou quota d'un hébergeur).
  if (contentType === 'text/html') {
    return fail('htmlPage', status);
  }
  const rangeSupported =
    status === 206 || (acceptRanges ?? '').toLowerCase() === 'bytes';
  const totalBytes =
    status === 206 ? parseContentRangeTotal(contentRange) : contentLength;
  return {kind: 'ok', status, contentType, totalBytes, rangeSupported};
}
