import type {MoyensRetraitResult} from './moyensRetrait.types';

function asRecord(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}
function asString(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

/** Mapper strict : seuls les éléments string non vides sont gardés. */
export function mapMoyensRetrait(
  status: number,
  body: unknown,
  bodyKind?: string,
): MoyensRetraitResult {
  if (bodyKind === 'invalid' || bodyKind === 'empty') {
    return {kind: 'failure', errorKind: 'server'};
  }
  if (status === 429 || status === 503) {
    return {kind: 'failure', errorKind: 'unavailable'};
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
  const raw = Array.isArray(payload.moyens) ? payload.moyens : [];
  const moyens = raw.filter(
    (x): x is string => typeof x === 'string' && x.trim().length > 0,
  );
  return {
    kind: 'success',
    pays: asString(payload.pays) ?? '',
    moyens,
  };
}
