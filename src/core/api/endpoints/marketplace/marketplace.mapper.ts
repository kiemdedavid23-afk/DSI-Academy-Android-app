import type {EnvelopeResult} from '@core/network';
import {
  asBool,
  asEpochMs,
  asHttpsUrl,
  asInt,
  asNumber,
  asRecord,
  asString,
  checkEnvelope,
  failure,
  normalizeOrderStatus,
} from '../commerce/commerce.mapper';
import type {
  CommerceCategory,
  CommerceOrder,
  CommerceOrderState,
  CommerceProduct,
  CommerceResult,
  CommerceWriteResult,
} from '../commerce/commerce.types';
import type {
  MarketplaceDelivery,
  MarketplaceReview,
  MarketplaceSeller,
} from './marketplace.types';

/**
 * Produit Marketplace → modèle commun. Un produit non publié ou PRIVATE est
 * écarté côté app : le Worker ne filtre pas partout (Rapport §11.2 n°3).
 */
export function mapMarketplaceProduct(raw: unknown): CommerceProduct | null {
  const r = asRecord(raw);
  if (!r) {
    return null;
  }
  const id = asString(r.id);
  const title = asString(r.title) ?? asString(r.name);
  const priceDsi = asInt(r.priceDsi);
  if (!id || !title || priceDsi === null || priceDsi < 0) {
    return null;
  }
  if (r.status !== undefined && r.status !== 'published') {
    return null;
  }
  if (r.visibility === 'PRIVATE') {
    return null;
  }
  return {
    source: 'marketplace',
    id,
    title,
    tagline: null,
    description: asString(r.description),
    category: asString(r.category),
    priceDsi,
    free: priceDsi === 0,
    coverUrl: asHttpsUrl(r.coverUrl),
    badge: null,
    featured: false,
    hasAsset: asBool(r.hasAsset),
    sellerId: asString(r.sellerId),
    storeName: asString(r.storeName),
    reviewAvg: asNumber(r.reviewAvg),
    reviewCount: asInt(r.reviewCount) ?? 0,
    salesCount: asInt(r.salesTotal) ?? asInt(r.salesCount) ?? 0,
    favoritesCount: asInt(r.favoritesCount) ?? 0,
  };
}

function mapList<T>(
  data: unknown,
  key: string,
  mapOne: (raw: unknown) => T | null,
): T[] {
  const list = asRecord(data)?.[key];
  if (!Array.isArray(list)) {
    return [];
  }
  const out: T[] = [];
  for (const raw of list) {
    const item = mapOne(raw);
    if (item) {
      out.push(item);
    }
  }
  return out;
}

/** Catalogue (liste, recherche, `ids=`) : l'ordre reçu est conservé. */
export function mapMarketplaceCatalogue(
  env: EnvelopeResult,
): CommerceResult<{items: CommerceProduct[]}> {
  const fail = checkEnvelope(env, 'marketplace');
  if (fail) {
    return fail;
  }
  return {
    kind: 'success',
    items: mapList(env.data, 'items', mapMarketplaceProduct),
  };
}

/** Détail : le Worker renvoie le produit à plat dans `data` (confirmé). */
export function mapMarketplaceProductDetail(
  env: EnvelopeResult,
): CommerceResult<{product: CommerceProduct}> {
  const fail = checkEnvelope(env, 'marketplace');
  if (fail) {
    return fail;
  }
  const product = mapMarketplaceProduct(env.data);
  if (!product) {
    return failure('notFound', env.status, 'NOT_FOUND');
  }
  return {kind: 'success', product};
}

export function mapMarketplaceCategories(
  env: EnvelopeResult,
): CommerceResult<{categories: CommerceCategory[]}> {
  const fail = checkEnvelope(env, 'marketplace');
  if (fail) {
    return fail;
  }
  const categories = mapList(env.data, 'categories', raw => {
    const r = asRecord(raw);
    const slug = asString(r?.category);
    const count = asInt(r?.count);
    return slug && count !== null ? {slug, count} : null;
  });
  return {kind: 'success', categories};
}

export function mapMarketplaceFavoriteIds(
  env: EnvelopeResult,
): CommerceResult<{ids: string[]}> {
  const fail = checkEnvelope(env, 'marketplace');
  if (fail) {
    return fail;
  }
  const raw = asRecord(env.data)?.listingIds;
  const ids = Array.isArray(raw)
    ? raw.filter((v): v is string => typeof v === 'string' && v !== '')
    : [];
  return {kind: 'success', ids};
}

export function mapMarketplaceFavoriteWrite(
  env: EnvelopeResult,
): CommerceWriteResult {
  const fail = checkEnvelope(env, 'marketplace');
  return fail ?? {kind: 'success'};
}

/** Commande (liste ou détail) → modèle commun : un seul article. */
export function mapMarketplaceOrder(raw: unknown): CommerceOrder | null {
  const r = asRecord(raw);
  const id = asString(r?.id);
  const priceDsi = asInt(r?.priceDsi);
  if (!r || !id || priceDsi === null) {
    return null;
  }
  const listingId = asString(r.listingId);
  return {
    source: 'marketplace',
    id,
    items: listingId
      ? [{productId: listingId, title: asString(r.listingTitle), qty: 1}]
      : [],
    totalDsi: priceDsi,
    discountDsi: 0,
    status: normalizeOrderStatus(r.status),
    rawStatus: asString(r.status),
    paymentRef: asString(r.paymentRef),
    failureReason: asString(r.financialReason),
    createdAt: asEpochMs(r.createdAt),
  };
}

export function mapMarketplaceOrders(
  env: EnvelopeResult,
): CommerceResult<{orders: CommerceOrder[]}> {
  const fail = checkEnvelope(env, 'marketplace');
  if (fail) {
    return fail;
  }
  return {
    kind: 'success',
    orders: mapList(env.data, 'orders', mapMarketplaceOrder),
  };
}

export function mapMarketplaceOrderDetail(
  env: EnvelopeResult,
): CommerceResult<{order: CommerceOrder}> {
  const fail = checkEnvelope(env, 'marketplace');
  if (fail) {
    return fail;
  }
  const order = mapMarketplaceOrder(asRecord(env.data)?.order);
  if (!order) {
    return failure('invalidResponse', env.status, 'INVALID_ORDER');
  }
  return {kind: 'success', order};
}

function mapOrderState(r: Record<string, unknown>): CommerceOrderState | null {
  const orderId = asString(r.orderId);
  if (!orderId) {
    return null;
  }
  const alreadyPaid = r.alreadyPaid === true;
  return {
    orderId,
    status: alreadyPaid ? 'paid' : normalizeOrderStatus(r.status),
    rawStatus: asString(r.status),
    totalDsi: asInt(r.priceDsi),
    replay: r.replay === true,
    note: null,
  };
}

/**
 * Création de commande : 200 `paid` ou `processing`. Un 502 UPSTREAM n'a pas
 * d'orderId : l'échec `indeterminate` impose de rejouer avec la MÊME clé.
 */
export function mapMarketplaceCreateOrder(
  env: EnvelopeResult,
): CommerceResult<{order: CommerceOrderState; pending: boolean}> {
  const fail = checkEnvelope(env, 'marketplace', 'purchase');
  if (fail) {
    return fail;
  }
  const order = mapOrderState(asRecord(env.data) ?? {});
  if (!order) {
    return failure('invalidResponse', env.status, 'INVALID_ORDER');
  }
  return {kind: 'success', order, pending: order.status === 'processing'};
}

/** Vérification (reconcile) : ne crée jamais un second débit. */
export function mapMarketplaceReconcile(
  env: EnvelopeResult,
): CommerceResult<{order: CommerceOrderState}> {
  const fail = checkEnvelope(env, 'marketplace');
  if (fail) {
    return fail;
  }
  const order = mapOrderState(asRecord(env.data) ?? {});
  if (!order) {
    return failure('invalidResponse', env.status, 'INVALID_ORDER');
  }
  return {kind: 'success', order};
}

/** Livraison : lien https obligatoire, jamais un autre schéma. */
export function mapMarketplaceDelivery(
  env: EnvelopeResult,
): CommerceResult<MarketplaceDelivery> {
  const fail = checkEnvelope(env, 'marketplace');
  if (fail) {
    return fail;
  }
  const r = asRecord(env.data);
  const orderId = asString(r?.orderId);
  const deliveryUrl = asHttpsUrl(r?.deliveryUrl);
  if (!orderId || !deliveryUrl) {
    return failure('invalidResponse', env.status, 'INVALID_DELIVERY');
  }
  return {
    kind: 'success',
    orderId,
    title: asString(r?.title),
    deliveryUrl,
  };
}

/* ------------------------- Tendances, vendeurs, avis (L9a) ---------------- */

/** Tendances : l'ordre reçu est conservé (classement serveur, 40 maximum). */
export function mapMarketplaceTrending(
  env: EnvelopeResult,
): CommerceResult<{items: CommerceProduct[]}> {
  return mapMarketplaceCatalogue(env);
}

export function mapMarketplaceSellerRow(raw: unknown): MarketplaceSeller | null {
  const r = asRecord(raw);
  if (!r) {
    return null;
  }
  const memberId = asString(r.memberId);
  const storeName = asString(r.storeName);
  if (!memberId || !storeName) {
    return null;
  }
  return {
    memberId,
    storeName,
    bio: asString(r.bio),
    rating: asNumber(r.rating),
    productsCount: Math.max(0, asInt(r.productsCount) ?? 0),
  };
}

export function mapMarketplaceSellers(
  env: EnvelopeResult,
): CommerceResult<{sellers: MarketplaceSeller[]}> {
  const fail = checkEnvelope(env, 'marketplace');
  if (fail) {
    return fail;
  }
  return {
    kind: 'success',
    sellers: mapList(env.data, 'sellers', mapMarketplaceSellerRow),
  };
}

/**
 * Boutique d'un vendeur : `{seller, products}`. Les produits PRIVATE sont
 * écartés par `mapMarketplaceProduct` (le Worker ne les filtre pas, §11.2).
 * Un produit sans nom de boutique reprend celui du vendeur.
 */
export function mapMarketplaceSellerDetail(
  env: EnvelopeResult,
): CommerceResult<{seller: MarketplaceSeller; products: CommerceProduct[]}> {
  const fail = checkEnvelope(env, 'marketplace');
  if (fail) {
    return fail;
  }
  const seller = mapMarketplaceSellerRow(asRecord(env.data)?.seller);
  if (!seller) {
    return failure('notFound', env.status, 'NOT_FOUND');
  }
  const products = mapList(env.data, 'products', mapMarketplaceProduct).map(
    p => ({
      ...p,
      storeName: p.storeName ?? seller.storeName,
      sellerId: p.sellerId ?? seller.memberId,
    }),
  );
  return {kind: 'success', seller, products};
}

/** Avis : du plus récent au plus ancien ; note hors 1..5 ignorée. */
export function mapMarketplaceReviews(
  env: EnvelopeResult,
): CommerceResult<{reviews: MarketplaceReview[]}> {
  const fail = checkEnvelope(env, 'marketplace');
  if (fail) {
    return fail;
  }
  const reviews = mapList(env.data, 'reviews', raw => {
    const r = asRecord(raw);
    const id = asString(r?.id);
    const rating = asInt(r?.rating);
    if (!r || !id || rating === null || rating < 1 || rating > 5) {
      return null;
    }
    return {
      id,
      rating,
      comment: asString(r.comment),
      createdAt: asEpochMs(r.createdAt),
    };
  });
  reviews.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  return {kind: 'success', reviews};
}

/** POST /listings/:id/reviews : 201 attendu ; 403 pas acheteur, 409 déjà noté. */
export function mapMarketplaceReviewWrite(
  env: EnvelopeResult,
): CommerceWriteResult {
  const fail = checkEnvelope(env, 'marketplace');
  return fail ?? {kind: 'success'};
}
