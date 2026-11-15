import type {
  PaymentNetwork,
  PaymentNetworksResult,
  PaymentStatusResult,
} from './paiement.types';

function asRecord(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}
function asString(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}
function asNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}
function asBool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

function mapNetwork(raw: unknown): PaymentNetwork | null {
  const r = asRecord(raw);
  if (!r) {
    return null;
  }
  const code = asString(r.code);
  if (!code) {
    return null;
  }
  const instructions = asString(r.instructionsOtp);
  return {
    code,
    libelle: asString(r.libelle) ?? code,
    otpRequis: asBool(r.otpRequis, false),
    instructionsOtp: instructions ?? '',
  };
}

export function mapPaymentNetworks(
  status: number,
  body: unknown,
  bodyKind?: string,
): PaymentNetworksResult {
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
  const reseauxRaw = Array.isArray(payload.reseaux) ? payload.reseaux : [];
  const reseaux = reseauxRaw
    .map(mapNetwork)
    .filter((x): x is PaymentNetwork => x != null);
  return {
    kind: 'success',
    data: {
      mode: asString(payload.mode) ?? 'direct',
      montant: asNumber(payload.montant, 0),
      prix: typeof payload.prix === 'number' ? payload.prix : null,
      frais: typeof payload.frais === 'number' ? payload.frais : null,
      devise: asString(payload.devise),
      reseaux,
    },
  };
}

export function mapPaymentStatus(
  status: number,
  body: unknown,
  bodyKind?: string,
): PaymentStatusResult {
  if (bodyKind === 'invalid' || bodyKind === 'empty') {
    return {kind: 'failure', errorKind: 'server'};
  }
  if (status === 401) {
    return {
      kind: 'failure',
      errorKind: 'business',
      sessionExpired: true,
    };
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
  const st = asString(payload?.status);
  if (!st) {
    return {kind: 'failure', errorKind: 'server'};
  }
  return {kind: 'success', status: st};
}
