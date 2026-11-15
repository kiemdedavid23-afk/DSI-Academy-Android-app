import type {
  MemberPayment,
  MemberPaymentsResult,
} from './paiements.types';

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

function mapOne(raw: unknown): MemberPayment | null {
  const r = asRecord(raw);
  if (!r) {
    return null;
  }
  const montant =
    typeof r.montant === 'number' || typeof r.montant === 'string'
      ? r.montant
      : null;
  return {
    idTransaction: asString(r.idTransaction),
    referenceExterne: asString(r.referenceExterne),
    typePaiement: asString(r.typePaiement),
    plateforme: asString(r.plateforme),
    montant,
    devise: asString(r.devise),
    statut: asString(r.statut),
    dateConfirmation: asString(r.dateConfirmation),
    dateCreation: asString(r.dateCreation),
  };
}

export function mapMemberPayments(
  status: number,
  body: unknown,
  bodyKind?: string,
): MemberPaymentsResult {
  if (bodyKind === 'invalid' || bodyKind === 'empty') {
    return {kind: 'failure', errorKind: 'server'};
  }
  if (status === 401) {
    return {kind: 'failure', errorKind: 'business', sessionExpired: true};
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
  const list = Array.isArray(payload.paiements) ? payload.paiements : [];
  const paiements = list
    .map(mapOne)
    .filter((x): x is MemberPayment => x != null);
  return {
    kind: 'success',
    data: {
      paiements,
      page: asNumber(payload.page, 1),
      limit: asNumber(payload.limit, 20),
      total: asNumber(payload.total, paiements.length),
      totalPages: asNumber(payload.totalPages, 1),
    },
  };
}
