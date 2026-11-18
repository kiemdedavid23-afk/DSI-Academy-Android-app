/**
 * Bibliothèque Boutique (L8d-3). Les achats viennent de GET /library ;
 * l'ouverture demande une URL temporaire (300 s) pour l'`assetFileId`
 * réellement acquis, jamais reconstruit. Relue à chaque ouverture : aucun
 * cache, aucune lecture hors ligne.
 */

import {
  fetchShopLibrary,
  fetchShopReadUrl,
} from '@core/api/endpoints/shop/shop.api';
import type {CommerceErrorKind} from '@core/api/endpoints/commerce/commerce.types';
import type {ShopLibraryItem} from '@core/api/endpoints/shop/shop.types';
import {storeRegistry} from '@shared/store';
import {createSimpleStore} from './simpleStore';
import type {LoadStatus} from './commerceStores';

export type LibraryState = {
  items: ShopLibraryItem[];
  status: LoadStatus;
  errorKind: CommerceErrorKind | null;
  /** Produit dont l'URL est en cours de demande (un seul à la fois). */
  openingId: string | null;
};

export type LibraryOpenResult =
  | {ok: true; url: string}
  | {ok: false; errorKind: CommerceErrorKind};

const initial = (): LibraryState => ({
  items: [],
  status: 'idle',
  errorKind: null,
  openingId: null,
});

function byNewest(a: ShopLibraryItem, b: ShopLibraryItem): number {
  return (b.grantedAt ?? 0) - (a.grantedAt ?? 0);
}

function createLibraryStore() {
  const store = createSimpleStore<LibraryState>(initial());
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
      // La liste déjà affichée reste visible pendant un rechargement.
      store.setState({status: 'loading', errorKind: null});
      const res = await fetchShopLibrary();
      if (mine !== generation) {
        return;
      }
      if (res.kind === 'failure') {
        store.setState({status: 'error', errorKind: res.errorKind});
        return;
      }
      store.setState({status: 'success', items: [...res.items].sort(byNewest)});
    },
    /**
     * Ouvre un achat. Sans fichier déterminé (`hasAsset` faux ou id absent) :
     * aucun appel, échec `entitlementUnavailable` (à signaler au support).
     */
    open: async (productId: string): Promise<LibraryOpenResult> => {
      const s = store.getState();
      if (s.openingId !== null) {
        return {ok: false, errorKind: 'conflict'};
      }
      const item = s.items.find(i => i.productId === productId);
      if (!item || !item.hasAsset || !item.assetFileId) {
        return {ok: false, errorKind: 'entitlementUnavailable'};
      }
      store.setState({openingId: productId});
      try {
        const res = await fetchShopReadUrl(item.assetFileId);
        if (res.kind === 'failure') {
          return {ok: false, errorKind: res.errorKind};
        }
        return {ok: true, url: res.url};
      } finally {
        store.setState({openingId: null});
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

export const shopLibraryStore = createLibraryStore();
