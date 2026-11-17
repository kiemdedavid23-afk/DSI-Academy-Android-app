/**
 * Catalogue d'une maison (un store par type de contenu).
 * Liste paginée par curseur (API.md : GET /content, les DEUX valeurs du curseur),
 * filtre de catégorie, rechargement, « charger la suite ».
 * La visibilité (published + active) est appliquée par le mapper (L4a).
 */

import {clearContentCache} from '@core/cache/diskCache';
import {fetchCatalogue} from '@core/api/endpoints/content/catalogue.api';
import type {CatalogueCursor} from '@core/utils/contentDisplay';
import type {
  Content,
  ContentErrorKind,
  ContentType,
} from '@core/utils/contentDisplay';
import {storeRegistry} from '@shared/store';
import {createSimpleStore} from './simpleStore';

/** Taille de page choisie pour l'app (défaut Worker 30, max 100). */
export const CATALOGUE_PAGE_SIZE = 20;

export type CatalogueStatus = 'idle' | 'loading' | 'success' | 'error';

export type CatalogueState = {
  type: ContentType;
  categoryId: number | null;
  items: Content[];
  nextCursor: CatalogueCursor | null;
  status: CatalogueStatus;
  loadingMore: boolean;
  errorKind: ContentErrorKind | null;
};

function initialState(type: ContentType): CatalogueState {
  return {
    type,
    categoryId: null,
    items: [],
    nextCursor: null,
    status: 'idle',
    loadingMore: false,
    errorKind: null,
  };
}

function appendUnique(current: Content[], more: Content[]): Content[] {
  const seen = new Set(current.map(c => c.id));
  return current.concat(more.filter(c => !seen.has(c.id)));
}

export function createCatalogueStore(type: ContentType) {
  const store = createSimpleStore<CatalogueState>(initialState(type));
  // Une réponse arrivée après un changement de catégorie / un reset est ignorée.
  let generation = 0;

  async function loadFirst(): Promise<void> {
    generation += 1;
    const mine = generation;
    const {categoryId} = store.getState();
    store.setState({
      status: 'loading',
      errorKind: null,
      items: [],
      nextCursor: null,
      loadingMore: false,
    });
    const res = await fetchCatalogue({
      type,
      categoryId: categoryId ?? undefined,
      limit: CATALOGUE_PAGE_SIZE,
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
      nextCursor: res.nextCursor,
    });
  }

  async function loadMore(): Promise<void> {
    const s = store.getState();
    if (s.status !== 'success' || s.loadingMore || !s.nextCursor) {
      return;
    }
    const mine = generation;
    store.setState({loadingMore: true});
    const res = await fetchCatalogue({
      type,
      categoryId: s.categoryId ?? undefined,
      limit: CATALOGUE_PAGE_SIZE,
      cursor: s.nextCursor,
    });
    if (mine !== generation) {
      return;
    }
    if (res.kind === 'failure') {
      // On garde la liste déjà affichée ; la suite peut être redemandée.
      store.setState({loadingMore: false});
      return;
    }
    store.setState({
      loadingMore: false,
      items: appendUnique(store.getState().items, res.items),
      nextCursor: res.nextCursor,
    });
  }

  const api = {
    getState: store.getState,
    subscribe: store.subscribe,
    /** Premier chargement ; sans effet si la liste est déjà affichée. */
    load: async (opts?: {force?: boolean}) => {
      if (opts?.force) {
        await clearContentCache();
      }
      const s = store.getState();
      if (!opts?.force && (s.status === 'success' || s.status === 'loading')) {
        return;
      }
      await loadFirst();
    },
    loadMore,
    setCategory: async (categoryId: number | null) => {
      if (store.getState().categoryId === categoryId) {
        return;
      }
      store.setState({categoryId});
      await loadFirst();
    },
    reset: () => {
      generation += 1;
      store.replace(initialState(type));
    },
    purge: () => api.reset(),
  };
  storeRegistry.register(api);
  return api;
}

export type CatalogueStore = ReturnType<typeof createCatalogueStore>;

/** Bibliothèque = contenus de type « book » (API.md). */
export const libraryCatalogueStore = createCatalogueStore('book');
