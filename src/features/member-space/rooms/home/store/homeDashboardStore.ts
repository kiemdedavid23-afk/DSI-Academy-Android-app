/**
 * Tableau de bord accueil : solde + retraits (best-effort).
 * Profil / abonnement via stores transverses shared.
 * Retraits : withdrawalsStore partagé (L3c).
 */

import {fetchMemberBalance} from '@core/api/endpoints/payment/membre.api';
import type {MemberBalance} from '@core/api/endpoints/payment/membre.types';
import {
  createResourceStore,
  memberProfileStore,
  memberSubscriptionStore,
  storeRegistry,
  withdrawalsStore,
} from '@shared/store';

const TTL_MS = 60_000;

async function loadBalance(): Promise<MemberBalance> {
  const result = await fetchMemberBalance();
  if (result.kind !== 'success') {
    throw new Error(result.message ?? result.errorKind);
  }
  return result.data;
}

export const memberBalanceStore = createResourceStore<MemberBalance>({
  ttlMs: TTL_MS,
  fetcher: loadBalance,
});

/** Alias stable pour l'accueil (même instance que shared withdrawalsStore). */
export const memberWithdrawalsStore = withdrawalsStore;

storeRegistry.register(memberBalanceStore);

export async function loadHomeDashboard(options?: {
  force?: boolean;
}): Promise<void> {
  await Promise.all([
    memberProfileStore.load(options),
    memberSubscriptionStore.load(options),
    memberBalanceStore.load(options),
    withdrawalsStore.load(options),
  ]);
}
