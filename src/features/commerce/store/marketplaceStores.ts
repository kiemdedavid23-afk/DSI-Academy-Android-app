/**
 * Stores propres à la Marketplace (L9a) : tendances, vendeurs, boutique d'un
 * vendeur, avis d'un produit. Décision D3 : ces fonctions restent chez la
 * Marketplace, hors de l'interface commune `CommerceApi`. Les écrans ne
 * parlent qu'à ces stores (R-LAY-5). Tendances, vendeurs et avis ne sont
 * jamais conservés hors ligne : chaque purge de session les vide.
 */

import {
  fetchMarketplaceReviews,
  fetchMarketplaceSeller,
  fetchMarketplaceSellers,
  fetchMarketplaceTrending,
  postMarketplaceReview,
} from '@core/api/endpoints/marketplace/marketplace.api';
import type {
  CommerceErrorKind,
  CommerceProduct,
  MarketplaceReview,
  MarketplaceSeller,
} from './commerceTypes';
import {storeRegistry} from '@shared/store';
import {createSimpleStore} from './simpleStore';
import type {LoadStatus} from './commerceStores';

/* -------------------------------- Tendances ------------------------------- */

export type TrendingState = {
  items: CommerceProduct[];
  status: LoadStatus;
  errorKind: CommerceErrorKind | null;
};

function createTrendingStore() {
  const initial = (): TrendingState => ({
    items: [],
    status: 'idle',
    errorKind: null,
  });
  const store = createSimpleStore<TrendingState>(initial());
  let generation = 0;

  const self = {
    getState: store.getState,
    subscribe: store.subscribe,
    load: async (opts?: {force?: boolean}) => {
      const s = store.getState();
      if (!opts?.force && (s.status === 'success' || s.status === 'loading')) {
        return;
      }
      generation += 1;
      const mine = generation;
      store.setState({status: 'loading', errorKind: null});
      const res = await fetchMarketplaceTrending();
      if (mine !== generation) {
        return;
      }
      if (res.kind === 'failure') {
        store.setState({status: 'error', errorKind: res.errorKind, items: []});
        return;
      }
      store.setState({status: 'success', items: res.items});
    },
    reset: () => {
      generation += 1;
      store.replace(initial());
    },
    purge: () => self.reset(),
  };
  storeRegistry.register(self);
  return self;
}

/* -------------------------------- Vendeurs -------------------------------- */

export type SellersState = {
  sellers: MarketplaceSeller[];
  status: LoadStatus;
  errorKind: CommerceErrorKind | null;
};

function createSellersStore() {
  const initial = (): SellersState => ({
    sellers: [],
    status: 'idle',
    errorKind: null,
  });
  const store = createSimpleStore<SellersState>(initial());
  let generation = 0;

  const self = {
    getState: store.getState,
    subscribe: store.subscribe,
    load: async (opts?: {force?: boolean}) => {
      const s = store.getState();
      if (!opts?.force && (s.status === 'success' || s.status === 'loading')) {
        return;
      }
      generation += 1;
      const mine = generation;
      store.setState({status: 'loading', errorKind: null});
      const res = await fetchMarketplaceSellers();
      if (mine !== generation) {
        return;
      }
      if (res.kind === 'failure') {
        store.setState({status: 'error', errorKind: res.errorKind, sellers: []});
        return;
      }
      store.setState({status: 'success', sellers: res.sellers});
    },
    reset: () => {
      generation += 1;
      store.replace(initial());
    },
    purge: () => self.reset(),
  };
  storeRegistry.register(self);
  return self;
}

/* ---------------------------- Boutique d'un vendeur ------------------------ */

export type SellerDetailState = {
  id: string | null;
  seller: MarketplaceSeller | null;
  products: CommerceProduct[];
  status: LoadStatus;
  errorKind: CommerceErrorKind | null;
};

function createSellerDetailStore() {
  const initial = (): SellerDetailState => ({
    id: null,
    seller: null,
    products: [],
    status: 'idle',
    errorKind: null,
  });
  const store = createSimpleStore<SellerDetailState>(initial());
  let generation = 0;

  const self = {
    getState: store.getState,
    subscribe: store.subscribe,
    /** Ouvre une boutique ; une réponse tardive d'une autre boutique est ignorée. */
    open: async (id: string, seed?: MarketplaceSeller | null) => {
      generation += 1;
      const mine = generation;
      const known = seed && seed.memberId === id ? seed : null;
      store.replace({
        id,
        seller: known,
        products: [],
        status: 'loading',
        errorKind: null,
      });
      const res = await fetchMarketplaceSeller(id);
      if (mine !== generation) {
        return;
      }
      if (res.kind === 'failure') {
        store.setState({status: 'error', errorKind: res.errorKind});
        return;
      }
      store.setState({
        status: 'success',
        seller: res.seller,
        products: res.products,
        errorKind: null,
      });
    },
    reset: () => {
      generation += 1;
      store.replace(initial());
    },
    purge: () => self.reset(),
  };
  storeRegistry.register(self);
  return self;
}

/* ---------------------------------- Avis ---------------------------------- */

export type ReviewsState = {
  productId: string | null;
  reviews: MarketplaceReview[];
  status: LoadStatus;
  errorKind: CommerceErrorKind | null;
  submitting: boolean;
};

export type SubmitReviewResult =
  | {ok: true}
  | {ok: false; errorKind: CommerceErrorKind};

function createReviewsStore() {
  const initial = (): ReviewsState => ({
    productId: null,
    reviews: [],
    status: 'idle',
    errorKind: null,
    submitting: false,
  });
  const store = createSimpleStore<ReviewsState>(initial());
  let generation = 0;

  async function load(productId: string): Promise<void> {
    generation += 1;
    const mine = generation;
    const sameProduct = store.getState().productId === productId;
    store.setState({
      productId,
      status: 'loading',
      errorKind: null,
      reviews: sameProduct ? store.getState().reviews : [],
    });
    const res = await fetchMarketplaceReviews(productId);
    if (mine !== generation) {
      return;
    }
    if (res.kind === 'failure') {
      store.setState({status: 'error', errorKind: res.errorKind, reviews: []});
      return;
    }
    store.setState({status: 'success', reviews: res.reviews});
  }

  const self = {
    getState: store.getState,
    subscribe: store.subscribe,
    load,
    /**
     * Donne un avis. Un seul envoi à la fois ; en cas de succès la liste est
     * relue. 403 (pas acheteur) et 409 (déjà noté) sont rendus tels quels.
     */
    submit: async (
      productId: string,
      rating: number,
      comment: string,
    ): Promise<SubmitReviewResult> => {
      if (store.getState().submitting) {
        return {ok: false, errorKind: 'conflict'};
      }
      store.setState({submitting: true});
      try {
        const res = await postMarketplaceReview(productId, rating, comment);
        if (res.kind === 'failure') {
          return {ok: false, errorKind: res.errorKind};
        }
        await load(productId);
        return {ok: true};
      } finally {
        store.setState({submitting: false});
      }
    },
    reset: () => {
      generation += 1;
      store.replace(initial());
    },
    purge: () => self.reset(),
  };
  storeRegistry.register(self);
  return self;
}

export const MARKETPLACE_STORES = {
  trending: createTrendingStore(),
  sellers: createSellersStore(),
  seller: createSellerDetailStore(),
  reviews: createReviewsStore(),
};
