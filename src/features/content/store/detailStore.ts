/**
 * Fiche détail d'un contenu (GET /content/:id).
 * Le Worker ne filtre pas le statut : le mapper (L4a) écarte tout contenu
 * non publié ou modéré, qui apparaît ici comme « notFound » / « unavailable ».
 * Les fiches déjà vues sont gardées en mémoire (session) : affichage immédiat.
 */

import {fetchContentById} from '@core/api/endpoints/content/catalogue.api';
import type {
  Content,
  ContentErrorKind,
} from '@core/utils/contentDisplay';
import {storeRegistry} from '@shared/store';
import {createSimpleStore} from './simpleStore';

export type DetailState = {
  id: number | null;
  item: Content | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  errorKind: ContentErrorKind | null;
};

const INITIAL: DetailState = {
  id: null,
  item: null,
  status: 'idle',
  errorKind: null,
};

export function createDetailStore() {
  const store = createSimpleStore<DetailState>(INITIAL);
  const cache = new Map<number, Content>();
  let generation = 0;

  async function load(id: number, opts?: {force?: boolean}): Promise<void> {
    generation += 1;
    const mine = generation;
    const cached = cache.get(id);
    if (cached && !opts?.force) {
      store.replace({id, item: cached, status: 'success', errorKind: null});
      return;
    }
    store.replace({id, item: null, status: 'loading', errorKind: null});
    const res = await fetchContentById(id);
    if (mine !== generation) {
      return;
    }
    if (res.kind === 'failure') {
      store.replace({id, item: null, status: 'error', errorKind: res.errorKind});
      return;
    }
    cache.set(id, res.item);
    store.replace({id, item: res.item, status: 'success', errorKind: null});
  }

  const api = {
    getState: store.getState,
    subscribe: store.subscribe,
    load,
    /** Fiche déjà connue (liste) : affichage immédiat, sans appel. */
    seed: (item: Content) => {
      cache.set(item.id, item);
    },
    reset: () => {
      generation += 1;
      cache.clear();
      store.replace(INITIAL);
    },
    purge: () => api.reset(),
  };
  storeRegistry.register(api);
  return api;
}

export const contentDetailStore = createDetailStore();
