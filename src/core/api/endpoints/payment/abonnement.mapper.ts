import type {RenewResult} from './abonnement.types';

function asRecord(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}
function asString(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

export function mapRenewSubscription(
  status: number,
  body: unknown,
  bodyKind?: string,
): RenewResult {
  if (bodyKind === 'invalid' || bodyKind === 'empty') {
    return {kind: 'failure', errorKind: 'server'};
  }
  if (status === 401) {
    return {
      kind: 'failure',
      errorKind: 'business',
      sessionExpired: true,
      message: asString(asRecord(body)?.erreur) ?? undefined,
    };
  }
  if (status === 429 || status === 503) {
    return {kind: 'failure', errorKind: 'unavailable'};
  }
  if (status !== 200) {
    const payload = asRecord(body);
    return {
      kind: 'failure',
      errorKind: status >= 500 ? 'server' : 'business',
      message: asString(payload?.erreur) ?? asString(payload?.message) ?? undefined,
    };
  }
  const payload = asRecord(body);
  if (!payload) {
    return {kind: 'failure', errorKind: 'server'};
  }
  const st = asString(payload.status);
  const message = asString(payload.message);
  if (st === 'active') {
    return {kind: 'success', status: 'active', message};
  }
  if (st === 'refuse') {
    return {
      kind: 'success',
      status: 'refuse',
      message,
      champ: asString(payload.champ),
    };
  }
  if (st === 'pending_payment') {
    const token = asString(payload.paymentTrackingToken);
    if (!token) {
      return {kind: 'failure', errorKind: 'server'};
    }
    return {
      kind: 'success',
      status: 'pending_payment',
      paymentMode: asString(payload.paymentMode),
      paymentUrl: asString(payload.paymentUrl),
      paymentTrackingToken: token,
      message,
    };
  }
  return {kind: 'failure', errorKind: 'server'};
}
