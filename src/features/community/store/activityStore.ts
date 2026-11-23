/** Fil d'activité global (C5). Cache court : le fil bouge peu, et se relit à l'ouverture. */

import {fetchActivity} from '@core/api/endpoints/community/activity.api';
import type {ActivityEvent} from '@core/api/endpoints/community/activity.types';
import {createResourceStore, storeRegistry} from '@shared/store';
import {failureKey} from './communityErrorKeys';

const TTL_MS = 30_000;

async function loadActivity(): Promise<ActivityEvent[]> {
  const res = await fetchActivity();
  if (res.kind !== 'success') {
    // Le store porte la clé de traduction comme message d'erreur.
    throw new Error(failureKey(res));
  }
  return res.items;
}

export const activityStore = createResourceStore<ActivityEvent[]>({
  ttlMs: TTL_MS,
  fetcher: loadActivity,
});

storeRegistry.register(activityStore);
