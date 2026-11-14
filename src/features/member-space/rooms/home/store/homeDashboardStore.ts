/**
 * Tableau de bord accueil : solde + retraits (best-effort).
 * Profil / abonnement via stores transverses shared.
 */

import {
  fetchMemberBalance,
  fetchMemberWithdrawals,
} from '@core/api/endpoints/payment/membre.api';
import type {
  MemberBalance,
  MemberWithdrawalsPage,
} from '@core/api/endpoints/payment/membre.types';
import {
  createResourceStore,
  memberProfileStore,
  memberSubscriptionStore,
  storeRegistry,
} from '@shared/store';

const TTL_MS = 60_000;

async function loadBalance(): Promise<MemberBalance> {
  const result = await fetchMemberBalance();
  if (result.kind !== 'success') {
    throw new Error(result.message ?? result.errorKind);
  }
  return result.data;
}

async function loadWithdrawals(): Promise<MemberWithdrawalsPage> {
  const result = await fetchMemberWithdrawals();
  if (result.kind !== 'success') {
    throw new Error(result.message ?? result.errorKind);
  }
  return result.data;
}

export const memberBalanceStore = createResourceStore<MemberBalance>({
  ttlMs: TTL_MS,
  fetcher: loadBalance,
});

export const memberWithdrawalsStore = createResourceStore<MemberWithdrawalsPage>({
  ttlMs: TTL_MS,
  fetcher: loadWithdrawals,
});

storeRegistry.register(memberBalanceStore);
storeRegistry.register(memberWithdrawalsStore);

export async function loadHomeDashboard(options?: {force?: boolean}): Promise<void> {
  await Promise.all([
    memberProfileStore.load(options),
    memberSubscriptionStore.load(options),
    memberBalanceStore.load(options),
    memberWithdrawalsStore.load(options),
  ]);
}
