import type {RedeemCodeResult} from './codeCadeau.types';

function asRecord(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}
function asString(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}
function asNumber(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

/**
 * Détection « déjà utilisé » : le site teste /déjà utilisé/i sur le message Worker.
 * Commentaire conservé pour la revue.
 */
export function mapRedeemCode(
  status: number,
  body: unknown,
  bodyKind?: string,
): RedeemCodeResult {
  if (bodyKind === 'invalid' || bodyKind === 'empty') {
    return {kind: 'failure', errorKind: 'server'};
  }
  if (status === 429) {
    return {kind: 'failure', errorKind: 'tooMany'};
  }
  if (status === 503) {
    return {kind: 'failure', errorKind: 'unavailable'};
  }
  if (status === 400) {
    return {kind: 'failure', errorKind: 'business', reason: 'empty'};
  }
  if (status !== 200) {
    return {
      kind: 'failure',
      errorKind: status >= 500 ? 'server' : 'business',
      message: asString(asRecord(body)?.erreur) ?? undefined,
    };
  }
  const payload = asRecord(body);
  if (!payload) {
    return {kind: 'failure', errorKind: 'server'};
  }
  const st = asString(payload.status);
  if (st === 'succes') {
    return {
      kind: 'success',
      status: 'succes',
      montantDsi: asNumber(payload.montantDsi),
      message: asString(payload.message),
    };
  }
  // refus ou autre
  const texte = String(payload.message || payload.erreur || '');
  // Site : /déjà utilisé/i → alreadyUsed ; sinon invalid générique
  const already = /déjà utilisé/i.test(texte);
  return {
    kind: 'success',
    status: 'refuse',
    reason: already ? 'alreadyUsed' : 'invalid',
    message: asString(payload.message),
  };
}
