import {http, safeEnvelope} from '@core/network';
import type {EnvelopeResult} from '@core/network';
import {sessionStore} from '@core/session';
import {failure} from '../commerce/commerce.mapper';
import type {
  CatalogueParams,
  CommerceFailure,
  PurchaseParams,
} from '../commerce/commerce.types';
import {isValidCheckoutKey} from '../commerce/commerce.idempotency';
import {
  mapShopCatalogue,
  mapShopCategories,
  mapShopCheckout,
  mapShopFavoriteIds,
  mapShopFavoriteWrite,
  mapShopLibrary,
  mapShopOrderDetail,
  mapShopOrders,
  mapShopProductDetail,
  mapShopReadUrl,
} from './shop.mapper';

/**
 * Worker Boutique (Contrat 1). Routes publiques : catalogue, détail,
 * catégories. Routes membre : X-Access-Proof, jamais le Bearer.
 */

function noProof(): CommerceFailure | null {
  return sessionStore.getAccessProof() ? null : failure('noProof', null);
}

const shop = () => http.service('shop');

export async function fetchShopCatalogue(params: CatalogueParams = {}) {
  const env = await safeEnvelope(
    shop().get('/api/shop/catalog', {
      auth: 'none',
      query: {
        category:
          params.category && params.category !== 'all'
            ? params.category
            : undefined,
        q: params.q ? params.q : undefined,
      },
    }),
  );
  return mapShopCatalogue(env);
}

export async function fetchShopProduct(id: string) {
  if (!id) {
    return failure('validation', null, 'MISSING_ID');
  }
  const env = await safeEnvelope(
    shop().get(`/api/shop/catalog/${encodeURIComponent(id)}`, {auth: 'none'}),
  );
  return mapShopProductDetail(env);
}

export async function fetchShopCategories() {
  const env = await safeEnvelope(
    shop().get('/api/shop/categories', {auth: 'none'}),
  );
  return mapShopCategories(env);
}

export async function fetchShopFavoriteIds() {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  const env = await safeEnvelope(
    shop().get('/api/shop/favorites', {auth: 'accessProof'}),
  );
  return mapShopFavoriteIds(env);
}

export async function addShopFavorite(productId: string) {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  const env = await safeEnvelope(
    shop().post('/api/shop/favorites', {productId}, {auth: 'accessProof'}),
  );
  return mapShopFavoriteWrite(env);
}

export async function removeShopFavorite(productId: string) {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  const env = await safeEnvelope(
    shop().delete(`/api/shop/favorites/${encodeURIComponent(productId)}`, {
      auth: 'accessProof',
    }),
  );
  return mapShopFavoriteWrite(env);
}

export async function fetchShopOrders() {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  const env = await safeEnvelope(
    shop().get('/api/shop/orders', {auth: 'accessProof'}),
  );
  return mapShopOrders(env);
}

export async function fetchShopOrder(id: string) {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  if (!id) {
    return failure('validation', null, 'MISSING_ID');
  }
  const env = await safeEnvelope(
    shop().get(`/api/shop/orders/${encodeURIComponent(id)}`, {
      auth: 'accessProof',
    }),
  );
  return mapShopOrderDetail(env);
}

/**
 * POST /api/shop/checkout. La clé part dans le corps (champ documenté) et
 * dans l'en-tête Idempotency-Key. Le montant et les lignes viennent du
 * panier serveur : l'app n'envoie jamais de prix.
 */
export async function shopCheckout(
  params: Pick<PurchaseParams, 'idempotencyKey' | 'promoCode'> & {
    retryOfOrderId?: string;
  },
) {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  if (!isValidCheckoutKey(params.idempotencyKey)) {
    return failure('validation', null, 'INVALID_IDEMPOTENCY_KEY');
  }
  const body: Record<string, unknown> = {
    idempotencyKey: params.idempotencyKey,
  };
  if (params.promoCode) {
    body.promoCode = params.promoCode;
  }
  if (params.retryOfOrderId) {
    body.retryOfOrderId = params.retryOfOrderId;
  }
  const env: EnvelopeResult = await safeEnvelope(
    shop().post('/api/shop/checkout', body, {
      auth: 'accessProof',
      headers: {'Idempotency-Key': params.idempotencyKey},
    }),
  );
  return mapShopCheckout(env);
}

export async function fetchShopLibrary() {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  const env = await safeEnvelope(
    shop().get('/api/shop/library', {auth: 'accessProof'}),
  );
  return mapShopLibrary(env);
}

/** `fileId` doit être l'`assetFileId` de la bibliothèque, jamais reconstruit. */
export async function fetchShopReadUrl(fileId: string) {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  if (!fileId) {
    return failure('validation', null, 'MISSING_FILE_ID');
  }
  const env = await safeEnvelope(
    shop().post(
      `/api/shop/media/${encodeURIComponent(fileId)}/read-url`,
      {},
      {auth: 'accessProof'},
    ),
  );
  return mapShopReadUrl(env);
}
