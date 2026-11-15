/**
 * Historique des retraits — store partagé (accueil, Avoirs DSI, Retraits).
 * Purge via storeRegistry à la déconnexion.
 */

import {fetchMemberWithdrawals} from '@core/api/endpoints/payment/membre.api';
import type {MemberWithdrawalsPage} from '@core/api/endpoints/payment/membre.types';
import {createResourceStore} from './createResourceStore';
import {storeRegistry} from './storeRegistry';

const TTL_MS = 60_000;

async function loadWithdrawals(): Promise<MemberWithdrawalsPage> {
  const result = await fetchMemberWithdrawals();
  if (result.kind !== 'success') {
    throw new Error(result.message ?? result.errorKind);
  }
  return result.data;
}

export const withdrawalsStore = createResourceStore<MemberWithdrawalsPage>({
  ttlMs: TTL_MS,
  fetcher: loadWithdrawals,
});

storeRegistry.register(withdrawalsStore);
