/**
 * Profil + abonnement partagés (tiroir + accueil).
 * createResourceStore × 2, purge via storeRegistry.
 */

import {
  fetchMemberProfile,
  fetchMemberSubscription,
} from '@core/api/endpoints/payment/membre.api';
import type {
  MemberProfile,
  MemberSubscription,
} from '@core/api/endpoints/payment/membre.types';
import {createResourceStore} from './createResourceStore';
import {storeRegistry} from './storeRegistry';

const TTL_MS = 60_000;

async function loadProfile(): Promise<MemberProfile> {
  const result = await fetchMemberProfile();
  if (result.kind !== 'success') {
    throw new Error(result.message ?? result.errorKind);
  }
  return result.data;
}

async function loadSubscription(): Promise<MemberSubscription> {
  const result = await fetchMemberSubscription();
  if (result.kind !== 'success') {
    throw new Error(result.message ?? result.errorKind);
  }
  return result.data;
}

export const memberProfileStore = createResourceStore<MemberProfile>({
  ttlMs: TTL_MS,
  fetcher: loadProfile,
});

export const memberSubscriptionStore = createResourceStore<MemberSubscription>({
  ttlMs: TTL_MS,
  fetcher: loadSubscription,
});

storeRegistry.register(memberProfileStore);
storeRegistry.register(memberSubscriptionStore);
