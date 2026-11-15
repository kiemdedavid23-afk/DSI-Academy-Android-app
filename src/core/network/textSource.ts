/**
 * Lecture bornée d'un texte brut chez la source (adresse directe du Worker).
 * Comme sourceProbe, appelle fetch directement (adresses absolues, R-NET-1).
 * Rien n'est écrit sur le disque : le texte reste en mémoire, plafonné.
 * Aucune adresse n'apparaît dans le résultat.
 */

export type TextReadFailureReason =
  | 'network'
  | 'timeout'
  | 'aborted'
  | 'rejected'
  | 'notFound'
  | 'rateLimited'
  | 'tooLarge'
  | 'server';

export type TextReadResult =
  | {kind: 'ok'; text: string}
  | {kind: 'failure'; reason: TextReadFailureReason; status: number | null};

export const TEXT_READ_TIMEOUT_MS = 30_000;

function fail(
  reason: TextReadFailureReason,
  status: number | null,
): TextReadResult {
  return {kind: 'failure', reason, status};
}

export async function readBoundedText(
  url: string,
  options: {maxBytes: number; signal?: AbortSignal; timeoutMs?: number},
): Promise<TextReadResult> {
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
  }, options.timeoutMs ?? TEXT_READ_TIMEOUT_MS);
  const cleanup = () => {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', onUserAbort);
  };

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });
    const status = response.status;
    if (status === 401 || status === 403) {
      return fail('rejected', status);
    }
    if (status === 404 || status === 410) {
      return fail('notFound', status);
    }
    if (status === 429) {
      return fail('rateLimited', status);
    }
    if (status !== 200) {
      return fail('server', status);
    }
    const declared = response.headers.get('Content-Length');
    if (declared && /^\d+$/.test(declared.trim()) && Number(declared) > options.maxBytes) {
      controller.abort();
      return fail('tooLarge', status);
    }
    const text = await response.text();
    // Une chaîne ne peut pas avoir plus de caractères que d'octets : borne sûre.
    if (text.length > options.maxBytes) {
      return fail('tooLarge', status);
    }
    return {kind: 'ok', text};
  } catch {
    if (timedOut) {
      return fail('timeout', null);
    }
    if (options.signal?.aborted) {
      return fail('aborted', null);
    }
    return fail('network', null);
  } finally {
    cleanup();
  }
}
