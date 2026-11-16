/**
 * Rangée « Dans la même catégorie » sous une fiche (site : createHousePages.jsx).
 * Vide si le contenu n'a pas de catégorie ; la fiche elle-même est écartée.
 */

import {fetchCatalogue} from '@core/api/endpoints/content/catalogue.api';
import type {Content} from '@core/utils/contentDisplay';
import {storeRegistry} from '@shared/store';
import {createSimpleStore} from './simpleStore';

const SIMILAR_LIMIT = 12;

export type SimilarState = {id: number | null; items: Content[]};

const INITIAL: SimilarState = {id: null, items: []};

export function createSimilarStore() {
  const store = createSimpleStore<SimilarState>(INITIAL);
  let generation = 0;

  async function load(item: Content): Promise<void> {
    generation += 1;
    const mine = generation;
    store.replace({id: item.id, items: []});
    if (item.categoryId === null) {
      return;
    }
    const res = await fetchCatalogue({
      type: item.type,
      categoryId: item.categoryId,
      limit: SIMILAR_LIMIT,
    });
    if (mine !== generation || res.kind === 'failure') {
      return;
    }
    store.replace({id: item.id, items: res.items.filter(c => c.id !== item.id)});
  }

  const api = {
    getState: store.getState,
    subscribe: store.subscribe,
    load,
    reset: () => {
      generation += 1;
      store.replace(INITIAL);
    },
    purge: () => api.reset(),
  };
  storeRegistry.register(api);
  return api;
}

export const contentSimilarStore = createSimilarStore();
