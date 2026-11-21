/**
 * Produits de l'espace vendeur (lot S5) : liste filtrée, recherche et
 * pagination par curseur (`GET /seller/listings`), actions du cycle de vie et
 * création / modification. Le Worker reste la source : après chaque action la
 * liste est relue (compteurs compris). Purgé à la déconnexion. Les erreurs sont
 * des natures (`errorKind`), jamais le texte du Worker (D17).
 */

import {createStore} from 'zustand/vanilla';
import {
  archiveSellerListing,
  createSellerListing,
  duplicateSellerListing,
  fetchSellerCategories,
  fetchSellerListing,
  fetchSellerListings,
  submitSellerListing,
  unpublishSellerListing,
  updateSellerListing,
} from '@core/api/endpoints/marketplace/seller/seller.api';
import {storeRegistry} from '@shared/store';
import type {
  SellerCategory,
  SellerListingCounts,
  SellerListingDetail,
  SellerListingInput,
  SellerListingSummary,
} from '../../store/sellerTypes';
import type {ProductAction, ProductFilter} from '../logic/sellerProductForm';

export type SellerProductsState = {
  items: SellerListingSummary[];
  counts: SellerListingCounts | null;
  nextCursor: string | null;
  filter: ProductFilter;
  query: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  loadingMore: boolean;
  error: string | null;
  /** Dernière action en échec (nature), pour un message sur l'écran. */
  actionError: string | null;
  busyId: string | null;
  categories: SellerCategory[];
};

const INITIAL: SellerProductsState = {
  items: [],
  counts: null,
  nextCursor: null,
  filter: 'all',
  query: '',
  status: 'idle',
  loadingMore: false,
  error: null,
  actionError: null,
  busyId: null,
  categories: [],
};

export const sellerProductsStore = createStore<SellerProductsState>(() => INITIAL);
const set = sellerProductsStore.setState;
const get = sellerProductsStore.getState;

/** Incrémenté à la purge : une réponse tardive d'une ancienne session est ignorée. */
let generation = 0;

async function loadFirstPage(): Promise<void> {
  const gen = generation;
  const {filter, query} = get();
  set({status: 'loading', error: null});
  const res = await fetchSellerListings({status: filter, q: query});
  if (gen !== generation) {
    return;
  }
  if (res.kind === 'failure') {
    set({status: 'error', error: res.errorKind});
    return;
  }
  set({
    status: 'success',
    items: res.page.items,
    counts: res.page.counts,
    nextCursor: res.page.nextCursor,
    error: null,
  });
}

export const sellerProducts = {
  load: loadFirstPage,

  async loadMore(): Promise<void> {
    const gen = generation;
    const {nextCursor, loadingMore, filter, query} = get();
    if (!nextCursor || loadingMore) {
      return;
    }
    set({loadingMore: true});
    const res = await fetchSellerListings({status: filter, q: query, cursor: nextCursor});
    if (gen !== generation) {
      return;
    }
    if (res.kind === 'failure') {
      set({loadingMore: false, actionError: res.errorKind});
      return;
    }
    const known = new Set(get().items.map(i => i.id));
    set({
      loadingMore: false,
      items: [...get().items, ...res.page.items.filter(i => !known.has(i.id))],
      counts: res.page.counts,
      nextCursor: res.page.nextCursor,
    });
  },

  async setFilter(filter: ProductFilter): Promise<void> {
    set({filter});
    await loadFirstPage();
  },

  async setQuery(query: string): Promise<void> {
    set({query: query.trim()});
    await loadFirstPage();
  },

  clearActionError(): void {
    set({actionError: null});
  },

  async loadCategories(): Promise<void> {
    if (get().categories.length > 0) {
      return;
    }
    const gen = generation;
    const res = await fetchSellerCategories();
    if (gen === generation && res.kind === 'success') {
      set({categories: res.items});
    }
  },

  /** Cycle de vie. Renvoie true si le Worker a accepté ; la liste est relue. */
  async act(id: string, action: Exclude<ProductAction, 'edit'>): Promise<boolean> {
    if (get().busyId) {
      return false;
    }
    set({busyId: id, actionError: null});
    const res =
      action === 'submit'
        ? await submitSellerListing(id)
        : action === 'unpublish'
        ? await unpublishSellerListing(id)
        : action === 'duplicate'
        ? await duplicateSellerListing(id)
        : await archiveSellerListing(id);
    if (res.kind === 'failure') {
      set({busyId: null, actionError: res.errorKind});
      return false;
    }
    set({busyId: null});
    await loadFirstPage();
    return true;
  },

  async fetchDetail(
    id: string,
  ): Promise<{listing: SellerListingDetail} | {errorKind: string}> {
    const res = await fetchSellerListing(id);
    return res.kind === 'failure' ? {errorKind: res.errorKind} : {listing: res.listing};
  },

  /** Création (`input.status` : draft ou pending_review) ou modification. */
  async save(
    input: SellerListingInput,
    editId: string | null,
  ): Promise<{ok: true} | {ok: false; errorKind: string}> {
    const res = editId
      ? await updateSellerListing(editId, input)
      : await createSellerListing(input);
    if (res.kind === 'failure') {
      return {ok: false, errorKind: res.errorKind};
    }
    await loadFirstPage();
    return {ok: true};
  },

  reset(): void {
    generation += 1;
    set(INITIAL);
  },
};

storeRegistry.register({purge: sellerProducts.reset});
