/**
 * Rangées de découverte d'une maison (site : createHousePages.jsx, page « Découvrir ») :
 * les nouveautés (la plus récente est mise en avant) puis une rangée par catégorie,
 * parmi les trois plus fournies.
 */

import {clearContentCache} from '@core/cache/diskCache';
import {fetchCatalogue, fetchCategories} from '@core/api/endpoints/content/catalogue.api';
import type {Content, ContentErrorKind, ContentType} from '@core/utils/contentDisplay';
import {storeRegistry} from '@shared/store';
import {sortByNewest} from '../logic/recent';
import type {DiscoverHouse} from './houseStores';
import {createSimpleStore} from './simpleStore';

const NEWEST_LIMIT = 12;
const RAIL_LIMIT = 10;
const RAIL_COUNT = 3;

export type Rail = {categoryId: number; name: string; items: Content[]};

export type RailsState = {
  status: 'idle' | 'loading' | 'success' | 'error';
  errorKind: ContentErrorKind | null;
  newest: Content[];
  rails: Rail[];
};

const INITIAL: RailsState = {
  status: 'idle',
  errorKind: null,
  newest: [],
  rails: [],
};

export function createRailsStore(type: ContentType) {
  const store = createSimpleStore<RailsState>(INITIAL);
  let generation = 0;

  async function load(opts?: {force?: boolean}): Promise<void> {
    if (opts?.force) {
      await clearContentCache();
    }
    const s = store.getState();
    if (!opts?.force && (s.status === 'success' || s.status === 'loading')) {
      return;
    }
    generation += 1;
    const mine = generation;
    store.replace({...INITIAL, status: 'loading'});

    const res = await fetchCatalogue({type, limit: NEWEST_LIMIT});
    if (mine !== generation) {
      return;
    }
    if (res.kind === 'failure') {
      store.replace({...INITIAL, status: 'error', errorKind: res.errorKind});
      return;
    }
    // Les nouveautés s'affichent tout de suite ; les rangées par catégorie suivent.
    store.replace({...INITIAL, status: 'success', newest: sortByNewest(res.items)});

    const cats = await fetchCategories(type);
    if (mine !== generation || cats.kind === 'failure') {
      return;
    }
    const top = [...cats.items].sort((a, b) => b.count - a.count).slice(0, RAIL_COUNT);
    const rails = await Promise.all(
      top.map(async c => {
        const r = await fetchCatalogue({type, categoryId: c.id, limit: RAIL_LIMIT});
        return {
          categoryId: c.id,
          name: c.name,
          items: r.kind === 'failure' ? [] : r.items,
        };
      }),
    );
    if (mine !== generation) {
      return;
    }
    store.setState({rails: rails.filter(r => r.items.length > 0)});
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

export type RailsStore = ReturnType<typeof createRailsStore>;

export const HOUSE_RAILS: Record<DiscoverHouse, RailsStore> = {
  library: createRailsStore('book'),
  audio: createRailsStore('audio'),
  videos: createRailsStore('video'),
  formations: createRailsStore('training'),
};
