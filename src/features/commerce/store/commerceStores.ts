/**
 * Stores communs Boutique + Marketplace (L8b) : un jeu de quatre stores par
 * source (catalogue, catégories, favoris, fiche). Les écrans ne connaissent
 * que `COMMERCE_STORES[source]` ; chaque source parle à son Worker via
 * `getCommerceApi` (L8a).
 */

import {getCommerceApi} from '@core/api/endpoints/commerce/commerce.sources';
import type {
  CommerceCategory,
  CommerceErrorKind,
  CommerceProduct,
  CommerceSource,
} from '@core/api/endpoints/commerce/commerce.types';
import {storeRegistry} from '@shared/store';
import {createSimpleStore} from './simpleStore';
import {
  commerceBalanceStore,
  createOrdersStore,
  createPurchaseStore,
} from './purchaseStores';

export type LoadStatus = 'idle' | 'loading' | 'success' | 'error';

/* ------------------------------- Catalogue ------------------------------- */

export type CatalogueState = {
  items: CommerceProduct[];
  category: string | null;
  query: string;
  status: LoadStatus;
  errorKind: CommerceErrorKind | null;
};

const initialCatalogue = (): CatalogueState => ({
  items: [],
  category: null,
  query: '',
  status: 'idle',
  errorKind: null,
});

function createCatalogueStore(source: CommerceSource) {
  const api = getCommerceApi(source);
  const store = createSimpleStore<CatalogueState>(initialCatalogue());
  // Une réponse arrivée après un changement de filtre ou un reset est ignorée.
  let generation = 0;

  async function run(): Promise<void> {
    generation += 1;
    const mine = generation;
    const {category, query} = store.getState();
    store.setState({status: 'loading', errorKind: null});
    const res = await api.fetchCatalogue({
      category: category ?? undefined,
      q: query.trim() === '' ? undefined : query.trim(),
    });
    if (mine !== generation) {
      return;
    }
    if (res.kind === 'failure') {
      store.setState({status: 'error', errorKind: res.errorKind, items: []});
      return;
    }
    store.setState({status: 'success', items: res.items});
  }

  const self = {
    getState: store.getState,
    subscribe: store.subscribe,
    /** Premier chargement ; sans effet si la liste est déjà affichée. */
    load: async (opts?: {force?: boolean}) => {
      const s = store.getState();
      if (!opts?.force && (s.status === 'success' || s.status === 'loading')) {
        return;
      }
      await run();
    },
    setCategory: async (category: string | null) => {
      if (store.getState().category === category) {
        return;
      }
      store.setState({category});
      await run();
    },
    setQuery: async (query: string) => {
      if (store.getState().query.trim() === query.trim()) {
        return;
      }
      store.setState({query});
      await run();
    },
    reset: () => {
      generation += 1;
      store.replace(initialCatalogue());
    },
    purge: () => self.reset(),
  };
  storeRegistry.register(self);
  return self;
}

/* ------------------------------- Catégories ------------------------------ */

export type CategoriesState = {
  items: CommerceCategory[];
  status: LoadStatus;
  errorKind: CommerceErrorKind | null;
};

function createCategoriesStore(source: CommerceSource) {
  const api = getCommerceApi(source);
  const initial = (): CategoriesState => ({
    items: [],
    status: 'idle',
    errorKind: null,
  });
  const store = createSimpleStore<CategoriesState>(initial());
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
      const res = await api.fetchCategories();
      if (mine !== generation) {
        return;
      }
      if (res.kind === 'failure') {
        // Les catégories sont un confort : la liste reste utilisable sans elles.
        store.setState({status: 'error', errorKind: res.errorKind, items: []});
        return;
      }
      store.setState({status: 'success', items: res.categories});
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

/* --------------------------------- Fiche --------------------------------- */

export type DetailState = {
  id: string | null;
  product: CommerceProduct | null;
  status: LoadStatus;
  errorKind: CommerceErrorKind | null;
};

function createDetailStore(source: CommerceSource) {
  const api = getCommerceApi(source);
  const initial = (): DetailState => ({
    id: null,
    product: null,
    status: 'idle',
    errorKind: null,
  });
  const store = createSimpleStore<DetailState>(initial());
  let generation = 0;

  const self = {
    getState: store.getState,
    subscribe: store.subscribe,
    /**
     * Ouvre une fiche. Un produit déjà connu (liste) s'affiche tout de suite ;
     * la fiche est relue pour avoir les champs complets.
     */
    open: async (id: string, seed?: CommerceProduct | null) => {
      generation += 1;
      const mine = generation;
      const known = seed && seed.id === id ? seed : null;
      store.replace({
        id,
        product: known,
        status: known ? 'success' : 'loading',
        errorKind: null,
      });
      const res = await api.fetchProduct(id);
      if (mine !== generation) {
        return;
      }
      if (res.kind === 'failure') {
        // Une fiche déjà affichée depuis la liste reste visible.
        if (!known) {
          store.setState({status: 'error', errorKind: res.errorKind});
        }
        return;
      }
      store.setState({status: 'success', product: res.product, errorKind: null});
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

/* -------------------------------- Favoris -------------------------------- */

export type FavoritesState = {
  ids: string[];
  items: CommerceProduct[];
  idsLoaded: boolean;
  status: LoadStatus;
  errorKind: CommerceErrorKind | null;
};

export type ToggleResult =
  | {ok: true; favorite: boolean}
  | {ok: false; errorKind: CommerceErrorKind};

function createFavoritesStore(source: CommerceSource) {
  const api = getCommerceApi(source);
  const initial = (): FavoritesState => ({
    ids: [],
    items: [],
    idsLoaded: false,
    status: 'idle',
    errorKind: null,
  });
  const store = createSimpleStore<FavoritesState>(initial());
  let generation = 0;
  const pending = new Set<string>();

  const self = {
    getState: store.getState,
    subscribe: store.subscribe,
    isFavorite: (id: string) => store.getState().ids.includes(id),
    /** Seulement les identifiants (cœur des cartes et des fiches) : un appel. */
    loadIds: async (opts?: {force?: boolean}) => {
      if (store.getState().idsLoaded && !opts?.force) {
        return;
      }
      generation += 1;
      const mine = generation;
      const res = await api.fetchFavoriteIds();
      if (mine !== generation) {
        return;
      }
      if (res.kind === 'failure') {
        store.setState({errorKind: res.errorKind});
        return;
      }
      store.setState({ids: res.ids, idsLoaded: true, errorKind: null});
    },
    /**
     * Liste complète des favoris. `known` : produits déjà chargés (catalogue)
     * pour éviter des appels ; ceux qui manquent sont relus par le Worker.
     */
    load: async (known?: CommerceProduct[]) => {
      generation += 1;
      const mine = generation;
      store.setState({status: 'loading', errorKind: null});
      const idsRes = await api.fetchFavoriteIds();
      if (mine !== generation) {
        return;
      }
      if (idsRes.kind === 'failure') {
        store.setState({status: 'error', errorKind: idsRes.errorKind});
        return;
      }
      const res = await api.fetchProductsByIds({ids: idsRes.ids, known});
      if (mine !== generation) {
        return;
      }
      if (res.kind === 'failure') {
        store.setState({status: 'error', errorKind: res.errorKind});
        return;
      }
      store.setState({
        ids: idsRes.ids,
        idsLoaded: true,
        items: res.items,
        status: 'success',
        errorKind: null,
      });
    },
    /** Ajoute ou retire un favori tout de suite ; annule si le Worker refuse. */
    toggle: async (product: CommerceProduct): Promise<ToggleResult> => {
      if (pending.has(product.id)) {
        return {ok: true, favorite: self.isFavorite(product.id)};
      }
      pending.add(product.id);
      const before = store.getState();
      const wasFavorite = before.ids.includes(product.id);
      store.setState({
        ids: wasFavorite
          ? before.ids.filter(id => id !== product.id)
          : [product.id, ...before.ids],
        items: wasFavorite
          ? before.items.filter(p => p.id !== product.id)
          : [product, ...before.items.filter(p => p.id !== product.id)],
      });
      try {
        const res = wasFavorite
          ? await api.removeFavorite(product.id)
          : await api.addFavorite(product.id);
        if (res.kind === 'failure') {
          store.setState({ids: before.ids, items: before.items});
          return {ok: false, errorKind: res.errorKind};
        }
        return {ok: true, favorite: !wasFavorite};
      } finally {
        pending.delete(product.id);
      }
    },
    reset: () => {
      generation += 1;
      pending.clear();
      store.replace(initial());
    },
    purge: () => self.reset(),
  };
  storeRegistry.register(self);
  return self;
}

/* ------------------------------ Jeu par source ---------------------------- */

function createStores(source: CommerceSource) {
  const orders = createOrdersStore(source);
  return {
    source,
    catalogue: createCatalogueStore(source),
    categories: createCategoriesStore(source),
    detail: createDetailStore(source),
    favorites: createFavoritesStore(source),
    orders,
    balance: commerceBalanceStore,
    // Un achat payé rafraîchit « Mes achats » et le solde.
    purchase: createPurchaseStore(source, {
      onPaid: () => {
        void orders.load({force: true});
        void commerceBalanceStore.load({force: true});
      },
    }),
  };
}

export type CommerceStores = ReturnType<typeof createStores>;

export const COMMERCE_STORES: Record<CommerceSource, CommerceStores> = {
  shop: createStores('shop'),
  marketplace: createStores('marketplace'),
};
