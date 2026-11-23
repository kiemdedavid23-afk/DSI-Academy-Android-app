/**
 * État communautaire du membre (GET /me) : profil, besoin de profil.
 * Partagé entre l'espace membre (création du profil, photo) et la Communauté.
 * createResourceStore, purge via storeRegistry (R-SEC-4).
 */

import {fetchCommunityMe} from '@core/api/endpoints/community/me.api';
import type {CommunityMe} from '@core/api/endpoints/community/me.types';
import {createResourceStore} from './createResourceStore';
import {storeRegistry} from './storeRegistry';

const TTL_MS = 60_000;

async function loadMe(): Promise<CommunityMe> {
  const result = await fetchCommunityMe();
  if (result.kind !== 'success') {
    // Le code du Worker est conservé dans le message pour que l'écran choisisse son libellé.
    throw new Error(result.code ?? result.errorKind);
  }
  return result.me;
}

export const communityMeStore = createResourceStore<CommunityMe>({
  ttlMs: TTL_MS,
  fetcher: loadMe,
});

storeRegistry.register(communityMeStore);
