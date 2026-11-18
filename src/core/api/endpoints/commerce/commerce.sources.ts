import {
  addMarketplaceFavorite,
  createMarketplaceOrder,
  fetchMarketplaceByIds,
  fetchMarketplaceCatalogue,
  fetchMarketplaceCategories,
  fetchMarketplaceFavoriteIds,
  fetchMarketplaceOrder,
  fetchMarketplaceOrders,
  fetchMarketplaceProduct,
  MARKETPLACE_IDS_MAX,
  reconcileMarketplaceOrder,
  removeMarketplaceFavorite,
} from '../marketplace/marketplace.api';
import {
  addShopFavorite,
  fetchShopCatalogue,
  fetchShopCategories,
  fetchShopFavoriteIds,
  fetchShopOrder,
  fetchShopOrders,
  fetchShopProduct,
  removeShopFavorite,
  shopCheckout,
} from '../shop/shop.api';
import type {
  CatalogueParams,
  CommerceCategory,
  CommerceOrder,
  CommerceOrderState,
  CommerceProduct,
  CommerceResult,
  CommerceSource,
  CommerceWriteResult,
  ProductsByIdsParams,
  PurchaseParams,
} from './commerce.types';

/**
 * Interface unique des deux sources (décision P1). Les stores et les écrans
 * communs ne connaissent que ce contrat ; chaque source l'implémente avec son
 * Worker. Ce qui est propre à une seule source (panier, code promo,
 * tendances, vendeurs, avis, bibliothèque, lecture) reste hors de cette
 * interface et arrive dans ses lots (L8c, L8d, L9a).
 */
export type CommerceApi = {
  source: CommerceSource;
  fetchCatalogue: (
    params?: CatalogueParams,
  ) => Promise<CommerceResult<{items: CommerceProduct[]}>>;
  fetchProduct: (id: string) => Promise<CommerceResult<{product: CommerceProduct}>>;
  fetchCategories: () => Promise<
    CommerceResult<{categories: CommerceCategory[]}>
  >;
  fetchFavoriteIds: () => Promise<CommerceResult<{ids: string[]}>>;
  addFavorite: (id: string) => Promise<CommerceWriteResult>;
  removeFavorite: (id: string) => Promise<CommerceWriteResult>;
  /** Produits demandés, dans l'ordre des ids ; indisponibles = absents. */
  fetchProductsByIds: (
    params: ProductsByIdsParams,
  ) => Promise<CommerceResult<{items: CommerceProduct[]}>>;
  fetchOrders: () => Promise<CommerceResult<{orders: CommerceOrder[]}>>;
  fetchOrder: (id: string) => Promise<CommerceResult<{order: CommerceOrder}>>;
  /** Achat d'un produit. Boutique : checkout du panier serveur (voir L8d). */
  purchase: (
    params: PurchaseParams,
  ) => Promise<CommerceResult<{order: CommerceOrderState; pending: boolean}>>;
  /** Vérifier une commande en cours, sans jamais créer un second débit. */
  verifyOrder: (
    orderId: string,
  ) => Promise<CommerceResult<{order: CommerceOrderState}>>;
};

/**
 * Favoris de la Boutique (décision validée) : catalogue déjà connu d'abord,
 * puis GET /catalog/:id pour chaque favori manquant. Un 404 masque le favori ;
 * toute autre erreur est rendue telle quelle.
 */
async function shopProductsByIds(
  params: ProductsByIdsParams,
): Promise<CommerceResult<{items: CommerceProduct[]}>> {
  const known = new Map<string, CommerceProduct>();
  for (const p of params.known ?? []) {
    known.set(p.id, p);
  }
  const wanted = params.ids.filter(id => id !== '');
  const missing = wanted.filter(id => !known.has(id));
  const fetched = await Promise.all(missing.map(id => fetchShopProduct(id)));
  for (let i = 0; i < missing.length; i += 1) {
    const res = fetched[i];
    if (res.kind === 'success') {
      known.set(missing[i], res.product);
    } else if (res.errorKind !== 'notFound') {
      return res;
    }
  }
  const items: CommerceProduct[] = [];
  for (const id of wanted) {
    const p = known.get(id);
    if (p) {
      items.push(p);
    }
  }
  return {kind: 'success', items};
}

/** Marketplace : `catalog?ids=` par lots de 100, ordre conservé. */
async function marketplaceProductsByIds(
  params: ProductsByIdsParams,
): Promise<CommerceResult<{items: CommerceProduct[]}>> {
  const wanted = params.ids.filter(id => id !== '');
  const items: CommerceProduct[] = [];
  for (let i = 0; i < wanted.length; i += MARKETPLACE_IDS_MAX) {
    const res = await fetchMarketplaceByIds(
      wanted.slice(i, i + MARKETPLACE_IDS_MAX),
    );
    if (res.kind === 'failure') {
      return res;
    }
    items.push(...res.items);
  }
  return {kind: 'success', items};
}

const shopApi: CommerceApi = {
  source: 'shop',
  fetchCatalogue: fetchShopCatalogue,
  fetchProduct: fetchShopProduct,
  fetchCategories: fetchShopCategories,
  fetchFavoriteIds: fetchShopFavoriteIds,
  addFavorite: addShopFavorite,
  removeFavorite: removeShopFavorite,
  fetchProductsByIds: shopProductsByIds,
  fetchOrders: fetchShopOrders,
  fetchOrder: fetchShopOrder,
  purchase: params =>
    shopCheckout({
      idempotencyKey: params.idempotencyKey,
      promoCode: params.promoCode,
    }),
  /** Boutique : on relit la commande (le serveur réconcilie à la lecture). */
  verifyOrder: async orderId => {
    const res = await fetchShopOrder(orderId);
    if (res.kind === 'failure') {
      return res;
    }
    return {
      kind: 'success',
      order: {
        orderId: res.order.id,
        status: res.order.status,
        rawStatus: res.order.rawStatus,
        totalDsi: res.order.totalDsi,
        replay: false,
        note: null,
      },
    };
  },
};

const marketplaceApi: CommerceApi = {
  source: 'marketplace',
  fetchCatalogue: fetchMarketplaceCatalogue,
  fetchProduct: fetchMarketplaceProduct,
  fetchCategories: fetchMarketplaceCategories,
  fetchFavoriteIds: fetchMarketplaceFavoriteIds,
  addFavorite: addMarketplaceFavorite,
  removeFavorite: removeMarketplaceFavorite,
  fetchProductsByIds: marketplaceProductsByIds,
  fetchOrders: fetchMarketplaceOrders,
  fetchOrder: fetchMarketplaceOrder,
  purchase: params =>
    createMarketplaceOrder({
      productId: params.productId,
      idempotencyKey: params.idempotencyKey,
    }),
  verifyOrder: reconcileMarketplaceOrder,
};

export function getCommerceApi(source: CommerceSource): CommerceApi {
  return source === 'shop' ? shopApi : marketplaceApi;
}
