import type {
  MemberReferral,
  MemberReferralResult,
  ReferralHistoryItem,
} from './parrainage.types';

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
function asBool(v: unknown): boolean | null {
  return typeof v === 'boolean' ? v : null;
}

function mapHistoryItem(raw: unknown): ReferralHistoryItem | null {
  const r = asRecord(raw);
  if (!r) {
    return null;
  }
  const montant =
    typeof r.montant === 'number' && Number.isFinite(r.montant)
      ? r.montant
      : typeof r.montant === 'string' && Number.isFinite(Number(r.montant))
        ? Number(r.montant)
        : null;
  return {
    type: asString(r.type),
    montant,
    identifiantDsiFilleul: asString(r.identifiantDsiFilleul),
    date: asString(r.date),
  };
}

export function mapMemberReferral(
  status: number,
  body: unknown,
  bodyKind?: string,
): MemberReferralResult {
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
  const hist = Array.isArray(payload.historique) ? payload.historique : [];
  const data: MemberReferral = {
    codeParrainagePersonnel: asString(payload.codeParrainagePersonnel),
    filleulsDirectsTotal: asNumber(payload.filleulsDirectsTotal, 0),
    filleulsDirectsActifs: asNumber(payload.filleulsDirectsActifs, 0),
    recompensesNiveau1Dsi: asNumber(payload.recompensesNiveau1Dsi, 0),
    recompensesNiveau2Dsi: asNumber(payload.recompensesNiveau2Dsi, 0),
    totalDsiParrainage: asNumber(payload.totalDsiParrainage, 0),
    historique: hist
      .map(mapHistoryItem)
      .filter((x): x is ReferralHistoryItem => x != null),
    historiqueLimite:
      typeof payload.historiqueLimite === 'number'
        ? payload.historiqueLimite
        : null,
    historiqueHasMore: asBool(payload.historiqueHasMore),
  };
  return {kind: 'success', data};
}
