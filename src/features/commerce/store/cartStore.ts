/**
 * Panier Boutique (L8d-1). Le serveur est la seule vérité : chaque écriture
 * renvoie le panier complet, qui remplace l'état local (pas de mise à jour
 * optimiste). Une seule écriture à la fois (`busyId`), jamais de prix envoyé.
 * Le code promo n'est qu'un aperçu : il est consommé au checkout.
 */

import {getCommerceApi} from '@core/api/endpoints/commerce/commerce.sources';
import {
  addShopCartItem,
  fetchShopCart,
  previewShopPromo,
  removeShopCartItem,
  replaceShopCart,
} from '@core/api/endpoints/shop/shop.api';
import type {
  CommerceErrorKind,
  CommerceProduct,
  CommerceResult,
} from '@core/api/endpoints/commerce/commerce.types';
import type {
  ShopCartLine,
  ShopPromoPreview,
} from '@core/api/endpoints/shop/shop.types';
import {storeRegistry} from '@shared/store';
import {createSimpleStore} from './simpleStore';
import type {LoadStatus} from './commerceStores';

export type PromoStatus = 'idle' | 'checking' | 'valid' | 'invalid';

export type CartState = {
  lines: ShopCartLine[];
  status: LoadStatus;
  errorKind: CommerceErrorKind | null;
  /** Produit en cours d'écriture ; '*' = remplacement complet. */
  busyId: string | null;
  promo: ShopPromoPreview | null;
  promoStatus: PromoStatus;
  promoErrorKind: CommerceErrorKind | null;
  /** Produits des lignes (titre, prix) : lus au catalogue ou à la fiche. */
  products: CommerceProduct[];
  productsStatus: LoadStatus;
  productsErrorKind: CommerceErrorKind | null;
};

export type CartWriteResult =
  | {ok: true}
  | {ok: false; errorKind: CommerceErrorKind};

const initial = (): CartState => ({
  lines: [],
  status: 'idle',
  errorKind: null,
  busyId: null,
  promo: null,
  promoStatus: 'idle',
  promoErrorKind: null,
  products: [],
  productsStatus: 'idle',
  productsErrorKind: null,
});

function createCartStore() {
  const store = createSimpleStore<CartState>(initial());
  let generation = 0;
  let promoGeneration = 0;

  const write = async (
    busyId: string,
    call: () => Promise<CommerceResult<{lines: ShopCartLine[]}>>,
  ): Promise<CartWriteResult> => {
    if (store.getState().busyId !== null) {
      return {ok: true};
    }
    generation += 1;
    const mine = generation;
    store.setState({busyId});
    const res = await call();
    if (mine !== generation) {
      return {ok: true};
    }
    if (res.kind === 'failure') {
      store.setState({busyId: null});
      return {ok: false, errorKind: res.errorKind};
    }
    store.setState({busyId: null, status: 'success', lines: res.lines});
    return {ok: true};
  };

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
      const res = await fetchShopCart();
      if (mine !== generation) {
        return;
      }
      if (res.kind === 'failure') {
        store.setState({status: 'error', errorKind: res.errorKind});
        return;
      }
      store.setState({status: 'success', lines: res.lines});
    },
    add: (productId: string) =>
      write(productId, () => addShopCartItem(productId, 1)),
    remove: (productId: string) =>
      write(productId, () => removeShopCartItem(productId)),
    /** Quantité ≤ 0 : retrait. Sinon remplacement complet du panier. */
    setQty: (productId: string, qty: number) => {
      if (!Number.isInteger(qty) || qty < 1) {
        return write(productId, () => removeShopCartItem(productId));
      }
      const next = store
        .getState()
        .lines.map(l => (l.productId === productId ? {...l, qty} : l));
      return write(productId, () => replaceShopCart(next));
    },
    /**
     * Lit les produits manquants (catalogue déjà connu d'abord, puis fiche ;
     * un 404 laisse la ligne sans produit = « indisponible »).
     */
    hydrate: async (known: CommerceProduct[] = []) => {
      const s = store.getState();
      const have = new Set(s.products.map(p => p.id));
      const ids = s.lines.map(l => l.productId);
      if (ids.every(id => have.has(id)) || s.productsStatus === 'loading') {
        return;
      }
      store.setState({productsStatus: 'loading', productsErrorKind: null});
      const res = await getCommerceApi('shop').fetchProductsByIds({
        ids,
        known: [...s.products, ...known],
      });
      if (res.kind === 'failure') {
        store.setState({
          productsStatus: 'error',
          productsErrorKind: res.errorKind,
        });
        return;
      }
      store.setState({productsStatus: 'success', products: res.items});
    },
    inCart: (productId: string): boolean =>
      store.getState().lines.some(l => l.productId === productId),
    /** Aperçu du code ; une réponse tardive d'un ancien code est ignorée. */
    previewPromo: async (code: string): Promise<CartWriteResult> => {
      const clean = code.trim().toUpperCase();
      if (!clean) {
        self.clearPromo();
        return {ok: true};
      }
      promoGeneration += 1;
      const mine = promoGeneration;
      store.setState({promoStatus: 'checking', promoErrorKind: null});
      const res = await previewShopPromo(clean);
      if (mine !== promoGeneration) {
        return {ok: true};
      }
      if (res.kind === 'failure') {
        store.setState({
          promo: null,
          promoStatus: 'invalid',
          promoErrorKind: res.errorKind,
        });
        return {ok: false, errorKind: res.errorKind};
      }
      store.setState({promo: res.promo, promoStatus: 'valid'});
      return {ok: true};
    },
    clearPromo: () => {
      promoGeneration += 1;
      store.setState({
        promo: null,
        promoStatus: 'idle',
        promoErrorKind: null,
      });
    },
    reset: () => {
      generation += 1;
      promoGeneration += 1;
      store.replace(initial());
    },
    purge: () => self.reset(),
  };
  storeRegistry.register(self);
  return self;
}

export const shopCartStore = createCartStore();
