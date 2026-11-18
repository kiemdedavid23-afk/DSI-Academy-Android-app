import type {EnvelopeResult} from '@core/network';
import {
  asBool,
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
  CommerceOrderItem,
  CommerceOrderState,
  CommerceProduct,
  CommerceResult,
  CommerceWriteResult,
} from '../commerce/commerce.types';
import type {
  ShopCartLine,
  ShopLibraryItem,
  ShopPromoPreview,
  ShopReadUrl,
} from './shop.types';

/** Première couverture https de `coverUrls` (Contrat 1 : préférée à coverFileId). */
function firstCover(v: unknown): string | null {
  if (!Array.isArray(v)) {
    return null;
  }
  for (const entry of v) {
    const url = asHttpsUrl(entry);
    if (url) {
      return url;
    }
  }
  return null;
}

/**
 * Produit Boutique → modèle commun. Un produit sans id, titre ou prix entier
 * est refusé ; un produit non publié est écarté par prudence.
 */
export function mapShopProduct(raw: unknown): CommerceProduct | null {
  const r = asRecord(raw);
  if (!r) {
    return null;
  }
  const id = asString(r.id);
  const title = asString(r.title);
  const priceDsi = asInt(r.priceDsi);
  if (!id || !title || priceDsi === null || priceDsi < 0) {
    return null;
  }
  if (r.status !== undefined && r.status !== 'published') {
    return null;
  }
  return {
    source: 'shop',
    id,
    title,
    tagline: asString(r.tagline),
    description: asString(r.description),
    category: asString(r.category),
    priceDsi,
    free: priceDsi === 0,
    coverUrl: firstCover(r.coverUrls),
    badge: asString(r.badge),
    featured: asBool(r.featured),
    hasAsset: asBool(r.hasAsset),
    sellerId: null,
    storeName: null,
    reviewAvg: null,
    reviewCount: 0,
    salesCount: 0,
    favoritesCount: 0,
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

export function mapShopCatalogue(
  env: EnvelopeResult,
): CommerceResult<{items: CommerceProduct[]}> {
  const fail = checkEnvelope(env, 'shop');
  if (fail) {
    return fail;
  }
  return {kind: 'success', items: mapList(env.data, 'items', mapShopProduct)};
}

export function mapShopProductDetail(
  env: EnvelopeResult,
): CommerceResult<{product: CommerceProduct}> {
  const fail = checkEnvelope(env, 'shop');
  if (fail) {
    return fail;
  }
  const product = mapShopProduct(env.data);
  if (!product) {
    return failure('notFound', env.status, 'NOT_FOUND');
  }
  return {kind: 'success', product};
}

export function mapShopCategories(
  env: EnvelopeResult,
): CommerceResult<{categories: CommerceCategory[]}> {
  const fail = checkEnvelope(env, 'shop');
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

export function mapShopFavoriteIds(
  env: EnvelopeResult,
): CommerceResult<{ids: string[]}> {
  const fail = checkEnvelope(env, 'shop');
  if (fail) {
    return fail;
  }
  const raw = asRecord(env.data)?.productIds;
  const ids = Array.isArray(raw)
    ? raw.filter((v): v is string => typeof v === 'string' && v !== '')
    : [];
  return {kind: 'success', ids};
}

/** Écriture d'un favori : succès si l'enveloppe est bonne (idempotent). */
export function mapShopFavoriteWrite(
  env: EnvelopeResult,
): CommerceWriteResult {
  const fail = checkEnvelope(env, 'shop');
  return fail ?? {kind: 'success'};
}

function mapOrderItem(raw: unknown): CommerceOrderItem | null {
  const r = asRecord(raw);
  const productId = asString(r?.productId);
  if (!r || !productId) {
    return null;
  }
  return {
    productId,
    title: asString(r.title),
    qty: asInt(r.qty),
  };
}

export function mapShopOrder(raw: unknown): CommerceOrder | null {
  const r = asRecord(raw);
  const id = asString(r?.id);
  const totalDsi = asInt(r?.totalDsi);
  if (!r || !id || totalDsi === null) {
    return null;
  }
  const items: CommerceOrderItem[] = [];
  if (Array.isArray(r.items)) {
    for (const entry of r.items) {
      const item = mapOrderItem(entry);
      if (item) {
        items.push(item);
      }
    }
  }
  return {
    source: 'shop',
    id,
    items,
    totalDsi,
    discountDsi: asInt(r.discountDsi) ?? 0,
    status: normalizeOrderStatus(r.status),
    rawStatus: asString(r.status),
    paymentRef: asString(r.paymentRef),
    failureReason: asString(r.failureReason),
    createdAt: asInt(r.createdAt),
  };
}

export function mapShopOrders(
  env: EnvelopeResult,
): CommerceResult<{orders: CommerceOrder[]}> {
  const fail = checkEnvelope(env, 'shop');
  if (fail) {
    return fail;
  }
  return {kind: 'success', orders: mapList(env.data, 'orders', mapShopOrder)};
}

export function mapShopOrderDetail(
  env: EnvelopeResult,
): CommerceResult<{order: CommerceOrder}> {
  const fail = checkEnvelope(env, 'shop');
  if (fail) {
    return fail;
  }
  const order = mapShopOrder(env.data);
  if (!order) {
    return failure('invalidResponse', env.status, 'INVALID_ORDER');
  }
  return {kind: 'success', order};
}

/**
 * Checkout : 200 = résultat connu, 202 = en cours ou indéterminé. Dans les
 * deux cas on rend l'état ; l'écran relit la commande tant qu'elle n'est ni
 * payée ni échouée, sans jamais changer de clé.
 */
export function mapShopCheckout(
  env: EnvelopeResult,
): CommerceResult<{order: CommerceOrderState; pending: boolean}> {
  const fail = checkEnvelope(env, 'shop', 'purchase');
  if (fail) {
    return fail;
  }
  const r = asRecord(env.data);
  const orderId = asString(r?.orderId);
  if (!r || !orderId) {
    return failure('invalidResponse', env.status, 'INVALID_ORDER');
  }
  const status = normalizeOrderStatus(r.status);
  return {
    kind: 'success',
    pending: env.status === 202 || status === 'processing',
    order: {
      orderId,
      status,
      rawStatus: asString(r.status),
      totalDsi: asInt(r.totalDsi),
      replay: r.replay === true,
      note: asString(r.note),
    },
  };
}

export function mapShopLibrary(
  env: EnvelopeResult,
): CommerceResult<{items: ShopLibraryItem[]}> {
  const fail = checkEnvelope(env, 'shop');
  if (fail) {
    return fail;
  }
  const items = mapList(env.data, 'items', raw => {
    const r = asRecord(raw);
    const productId = asString(r?.productId);
    if (!r || !productId) {
      return null;
    }
    return {
      productId,
      title: asString(r.title) ?? '',
      category: asString(r.category),
      assetFileId: asString(r.assetFileId),
      hasAsset: asBool(r.hasAsset),
      grantedAt: asInt(r.grantedAt),
      orderId: asString(r.orderId),
    };
  });
  return {kind: 'success', items};
}

const READ_URL_KEYS = ['url', 'readUrl', 'signedUrl'] as const;

/**
 * URL temporaire de lecture. Le Contrat ne fige pas la forme (couche de
 * stockage) : on accepte `url`, `readUrl` ou `signedUrl`, https seulement.
 */
export function mapShopReadUrl(
  env: EnvelopeResult,
): CommerceResult<ShopReadUrl> {
  const fail = checkEnvelope(env, 'shop');
  if (fail) {
    return fail;
  }
  const r = asRecord(env.data);
  for (const key of READ_URL_KEYS) {
    const url = asHttpsUrl(r?.[key]);
    if (url) {
      return {kind: 'success', url};
    }
  }
  return failure('invalidResponse', env.status, 'INVALID_READ_URL');
}

/** Panier serveur (B.1 à B.4) : seules les lignes à id et quantité entière ≥ 1 passent. */
export function mapShopCart(
  env: EnvelopeResult,
): CommerceResult<{lines: ShopCartLine[]}> {
  const fail = checkEnvelope(env, 'shop');
  if (fail) {
    return fail;
  }
  const lines = mapList(env.data, 'items', raw => {
    const r = asRecord(raw);
    const productId = asString(r?.productId);
    const qty = asInt(r?.qty);
    if (!productId || qty === null || qty < 1) {
      return null;
    }
    return {productId, qty};
  });
  return {kind: 'success', lines};
}

/**
 * Aperçu d'un code promo (B.10), indicatif : aucun quota consommé. Un type
 * autre que « percent » est gardé tel quel mais sans estimation côté app.
 */
export function mapShopPromo(
  env: EnvelopeResult,
): CommerceResult<{promo: ShopPromoPreview}> {
  const fail = checkEnvelope(env, 'shop');
  if (fail) {
    return fail;
  }
  const r = asRecord(env.data);
  const code = asString(r?.code);
  const value = asNumber(r?.value);
  if (!r || !code || value === null || value < 0) {
    return failure('invalidResponse', env.status, 'INVALID_PROMO');
  }
  return {
    kind: 'success',
    promo: {code, kind: r.type === 'percent' ? 'percent' : 'other', value},
  };
}
