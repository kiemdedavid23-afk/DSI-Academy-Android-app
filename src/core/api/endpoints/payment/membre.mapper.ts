/**
 * Mappers GET /api/membre/* — contrat Worker Paiement.
 * Lit `erreur` dans le corps avant de conclure au succès.
 */

import type {
  MemberBalance,
  MemberBalanceResult,
  MemberProfile,
  MemberProfileResult,
  MemberSubscription,
  MemberSubscriptionResult,
  MemberWithdrawal,
  MemberWithdrawalsPage,
  MemberWithdrawalsResult,
} from './membre.types';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function asNullableString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return typeof value === 'string' ? value : null;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) {
      return n;
    }
  }
  return fallback;
}

function businessOrServer(
  status: number,
  payload: Record<string, unknown> | null,
): MemberProfileResult {
  if (status === 401) {
    return {kind: 'failure', errorKind: 'server', message: asString(payload?.erreur) ?? undefined};
  }
  if (status === 429 || status === 503 || status >= 500) {
    return {kind: 'failure', errorKind: 'server'};
  }
  const err = asString(payload?.erreur);
  if (err) {
    return {kind: 'failure', errorKind: 'business', message: err};
  }
  return {kind: 'failure', errorKind: 'server'};
}

export function mapMemberProfile(
  status: number,
  body: unknown,
  bodyKind?: string,
): MemberProfileResult {
  if (bodyKind === 'invalid' || bodyKind === 'empty') {
    return {kind: 'failure', errorKind: 'server'};
  }
  const payload = asRecord(body);
  if (status !== 200) {
    return businessOrServer(status, payload);
  }
  if (!payload) {
    return {kind: 'failure', errorKind: 'server'};
  }
  const err = asString(payload.erreur);
  if (err) {
    return {kind: 'failure', errorKind: 'business', message: err};
  }
  const identifiantDsi = asString(payload.identifiantDsi);
  const nom = asString(payload.nom);
  if (!identifiantDsi || !nom) {
    return {kind: 'failure', errorKind: 'server'};
  }
  const data: MemberProfile = {
    identifiantDsi,
    nom,
    prenom: asString(payload.prenom) ?? '',
    whatsapp: asNullableString(payload.whatsapp),
    email: asNullableString(payload.email),
    pays: asNullableString(payload.pays),
    statut: asString(payload.statut) ?? 'active',
    codeParrainagePersonnel: asNullableString(payload.codeParrainagePersonnel),
  };
  return {kind: 'success', data};
}

export function mapMemberBalance(
  status: number,
  body: unknown,
  bodyKind?: string,
): MemberBalanceResult {
  if (bodyKind === 'invalid' || bodyKind === 'empty') {
    return {kind: 'failure', errorKind: 'server'};
  }
  const payload = asRecord(body);
  if (status !== 200) {
    return businessOrServer(status, payload) as MemberBalanceResult;
  }
  if (!payload) {
    return {kind: 'failure', errorKind: 'server'};
  }
  const err = asString(payload.erreur);
  if (err) {
    return {kind: 'failure', errorKind: 'business', message: err};
  }
  const data: MemberBalance = {
    identifiantDsi: asString(payload.identifiantDsi) ?? '',
    soldeDsiActuel: asNumber(payload.soldeDsiActuel, 0),
    totalDsiGagnes: asNumber(payload.totalDsiGagnes, 0),
  };
  return {kind: 'success', data};
}

export function mapMemberSubscription(
  status: number,
  body: unknown,
  bodyKind?: string,
): MemberSubscriptionResult {
  if (bodyKind === 'invalid' || bodyKind === 'empty') {
    return {kind: 'failure', errorKind: 'server'};
  }
  const payload = asRecord(body);
  if (status !== 200) {
    return businessOrServer(status, payload) as MemberSubscriptionResult;
  }
  if (!payload) {
    return {kind: 'failure', errorKind: 'server'};
  }
  const err = asString(payload.erreur);
  if (err) {
    return {kind: 'failure', errorKind: 'business', message: err};
  }
  const data: MemberSubscription = {
    formule: asNullableString(payload.formule),
    dateDebut: asNullableString(payload.dateDebut),
    dateFin: asNullableString(payload.dateFin),
    statut: asNullableString(payload.statut),
    modePaiement: asNullableString(payload.modePaiement),
    renouvellements: Array.isArray(payload.renouvellements)
      ? payload.renouvellements
      : [],
  };
  return {kind: 'success', data};
}

function mapOneWithdrawal(raw: unknown): MemberWithdrawal | null {
  const r = asRecord(raw);
  if (!r) {
    return null;
  }
  const id = asString(r.idRetrait);
  if (!id) {
    return null;
  }
  return {
    idRetrait: id,
    montantDsiDemande: asNumber(r.montantDsiDemande, 0),
    contributionStabiliteDsi: asNumber(r.contributionStabiliteDsi, 0),
    montantDsiNet: asNumber(r.montantDsiNet, 0),
    montantFcfa: asNumber(r.montantFcfa, 0),
    statut: asString(r.statut) ?? 'en_attente',
    dateDemande: asNullableString(r.dateDemande),
    dateTraitement: asNullableString(r.dateTraitement),
    moyenPaiement: asNullableString(r.moyenPaiement),
    numeroPaiement: asNullableString(r.numeroPaiement),
    pays: asNullableString(r.pays),
    reglesAppliquees: r.reglesAppliquees ?? null,
    referenceSequestre: asNullableString(r.referenceSequestre),
  };
}

export function mapMemberWithdrawals(
  status: number,
  body: unknown,
  bodyKind?: string,
): MemberWithdrawalsResult {
  if (bodyKind === 'invalid' || bodyKind === 'empty') {
    return {kind: 'failure', errorKind: 'server'};
  }
  const payload = asRecord(body);
  if (status !== 200) {
    return businessOrServer(status, payload) as MemberWithdrawalsResult;
  }
  if (!payload) {
    return {kind: 'failure', errorKind: 'server'};
  }
  const err = asString(payload.erreur);
  if (err) {
    return {kind: 'failure', errorKind: 'business', message: err};
  }
  const list = Array.isArray(payload.retraits) ? payload.retraits : [];
  const retraits: MemberWithdrawal[] = [];
  for (const item of list) {
    const w = mapOneWithdrawal(item);
    if (w) {
      retraits.push(w);
    }
  }
  const data: MemberWithdrawalsPage = {
    total: asNumber(payload.total, retraits.length),
    retraits,
  };
  return {kind: 'success', data};
}
