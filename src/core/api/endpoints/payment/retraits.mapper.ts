import type {
  WithdrawRequestResult,
  WithdrawalEvent,
  WithdrawalHistoryDetailResult,
} from './retraits.types';

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

export function mapWithdrawRequest(
  status: number,
  body: unknown,
  bodyKind?: string,
): WithdrawRequestResult {
  if (bodyKind === 'invalid' || bodyKind === 'empty') {
    return {kind: 'failure', errorKind: 'server'};
  }
  if (status === 429 || status === 503) {
    return {kind: 'failure', errorKind: 'unavailable'};
  }
  // Timeout / network handled in api layer as uncertain after POST
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
  if (st === 'refuse') {
    return {
      kind: 'success',
      status: 'refuse',
      message: asString(payload.message),
    };
  }
  if (st === 'demande_enregistree') {
    const id = asString(payload.idRetrait);
    if (!id) {
      return {kind: 'failure', errorKind: 'server'};
    }
    return {
      kind: 'success',
      status: 'demande_enregistree',
      idRetrait: id,
      montantDsiDemande: asNumber(payload.montantDsiDemande),
      montantDsiNet: asNumber(payload.montantDsiNet),
      montantFcfaDemande: asNumber(payload.montantFcfaDemande),
      fraisRetraitFcfa: asNumber(payload.fraisRetraitFcfa),
      montantFcfa: asNumber(payload.montantFcfa),
      statut: asString(payload.statut) ?? 'demande',
      dateDemande: asString(payload.dateDemande),
      moyenPaiement: asString(payload.moyenPaiement),
      message: asString(payload.message),
    };
  }
  return {kind: 'failure', errorKind: 'server'};
}

function mapEvent(raw: unknown): WithdrawalEvent | null {
  const r = asRecord(raw);
  if (!r) return null;
  return {
    champ: asString(r.champ),
    ancienneValeur: asString(r.ancienneValeur),
    nouvelleValeur: asString(r.nouvelleValeur),
    date: asString(r.date),
  };
}

export function mapWithdrawalHistoryDetail(
  status: number,
  body: unknown,
  bodyKind?: string,
): WithdrawalHistoryDetailResult {
  if (bodyKind === 'invalid' || bodyKind === 'empty') {
    return {kind: 'failure', errorKind: 'server'};
  }
  if (status === 404) {
    return {
      kind: 'failure',
      errorKind: 'business',
      notFound: true,
      message: asString(asRecord(body)?.erreur) ?? undefined,
    };
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
  const id = asString(payload.idRetrait);
  if (!id) {
    return {kind: 'failure', errorKind: 'server'};
  }
  const raw = Array.isArray(payload.evenements) ? payload.evenements : [];
  return {
    kind: 'success',
    data: {
      idRetrait: id,
      evenements: raw
        .map(mapEvent)
        .filter((x): x is WithdrawalEvent => x != null),
    },
  };
}
