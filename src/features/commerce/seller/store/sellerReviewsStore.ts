/**
 * Avis reçus (lot S8) : `GET /seller/reviews`, résumé et liste paginée par
 * curseur. Une réponse tardive d'une ancienne session est ignorée. Purgé à la
 * déconnexion.
 */

import {createStore} from 'zustand/vanilla';
import {fetchSellerReviews} from '@core/api/endpoints/marketplace/seller/seller.api';
import {storeRegistry} from '@shared/store';
import type {SellerReview, SellerReviewsPage} from '../../store/sellerTypes';

export type SellerReviewsState = {
  summary: SellerReviewsPage['summary'] | null;
  items: SellerReview[];
  nextCursor: string | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  loadingMore: boolean;
  error: string | null;
};

const INITIAL: SellerReviewsState = {
  summary: null,
  items: [],
  nextCursor: null,
  status: 'idle',
  loadingMore: false,
  error: null,
};

export const sellerReviewsStore = createStore<SellerReviewsState>(() => INITIAL);
const set = sellerReviewsStore.setState;
const get = sellerReviewsStore.getState;

let generation = 0;

export const sellerReviews = {
  async load(): Promise<void> {
    const gen = generation;
    set({status: 'loading', error: null});
    const res = await fetchSellerReviews();
    if (gen !== generation) {
      return;
    }
    if (res.kind === 'failure') {
      set({status: 'error', error: res.errorKind});
      return;
    }
    set({
      status: 'success',
      summary: res.page.summary,
      items: res.page.items,
      nextCursor: res.page.nextCursor,
      error: null,
    });
  },

  async loadMore(): Promise<void> {
    const gen = generation;
    const {nextCursor, loadingMore} = get();
    if (!nextCursor || loadingMore) {
      return;
    }
    set({loadingMore: true});
    const res = await fetchSellerReviews({cursor: nextCursor});
    if (gen !== generation) {
      return;
    }
    if (res.kind === 'failure') {
      set({loadingMore: false});
      return;
    }
    const known = new Set(get().items.map(i => i.id));
    set({
      loadingMore: false,
      items: [...get().items, ...res.page.items.filter(i => !known.has(i.id))],
      nextCursor: res.page.nextCursor,
    });
  },

  reset(): void {
    generation += 1;
    set(INITIAL);
  },
};

storeRegistry.register({purge: sellerReviews.reset});
