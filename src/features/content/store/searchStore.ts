/**
 * Recherche (GET /search) : visibilité imposée par le Worker (published + active).
 * Pagination par offset. Requête vide : aucun appel réseau, retour à l'état « idle ».
 */

import {searchContent} from '@core/api/endpoints/content/catalogue.api';
import type {
  Content,
  ContentErrorKind,
  ContentType,
} from '@core/utils/contentDisplay';
import {storeRegistry} from '@shared/store';
import {createSimpleStore} from './simpleStore';

/** Taille de page (défaut Worker 20, max 50). */
export const SEARCH_PAGE_SIZE = 20;

export type SearchState = {
  query: string;
  items: Content[];
  offset: number;
  hasMore: boolean;
  status: 'idle' | 'loading' | 'success' | 'error';
  loadingMore: boolean;
  errorKind: ContentErrorKind | null;
};

const INITIAL: SearchState = {
  query: '',
  items: [],
  offset: 0,
  hasMore: false,
  status: 'idle',
  loadingMore: false,
  errorKind: null,
};

export function createSearchStore(type: ContentType) {
  const store = createSimpleStore<SearchState>(INITIAL);
  let generation = 0;

  async function setQuery(raw: string): Promise<void> {
    const query = raw.trim();
    generation += 1;
    const mine = generation;
    if (query === '') {
      store.replace(INITIAL);
      return;
    }
    store.replace({...INITIAL, query, status: 'loading'});
    const res = await searchContent({
      query,
      type,
      limit: SEARCH_PAGE_SIZE,
      offset: 0,
    });
    if (mine !== generation) {
      return;
    }
    if (res.kind === 'failure') {
      store.setState({status: 'error', errorKind: res.errorKind});
      return;
    }
    store.setState({
      status: 'success',
      items: res.items,
      offset: res.offset + (res.limit || SEARCH_PAGE_SIZE),
      hasMore: res.items.length >= (res.limit || SEARCH_PAGE_SIZE),
    });
  }

  async function loadMore(): Promise<void> {
    const s = store.getState();
    if (s.status !== 'success' || s.loadingMore || !s.hasMore) {
      return;
    }
    const mine = generation;
    store.setState({loadingMore: true});
    const res = await searchContent({
      query: s.query,
      type,
      limit: SEARCH_PAGE_SIZE,
      offset: s.offset,
    });
    if (mine !== generation) {
      return;
    }
    if (res.kind === 'failure') {
      store.setState({loadingMore: false});
      return;
    }
    const seen = new Set(store.getState().items.map(c => c.id));
    store.setState({
      loadingMore: false,
      items: store.getState().items.concat(res.items.filter(c => !seen.has(c.id))),
      offset: res.offset + (res.limit || SEARCH_PAGE_SIZE),
      hasMore: res.items.length >= (res.limit || SEARCH_PAGE_SIZE),
    });
  }

  const api = {
    getState: store.getState,
    subscribe: store.subscribe,
    setQuery,
    loadMore,
    reset: () => {
      generation += 1;
      store.replace(INITIAL);
    },
    purge: () => api.reset(),
  };
  storeRegistry.register(api);
  return api;
}

export const librarySearchStore = createSearchStore('book');
