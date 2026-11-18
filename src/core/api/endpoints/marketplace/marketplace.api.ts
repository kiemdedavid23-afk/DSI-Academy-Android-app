import {http, safeEnvelope} from '@core/network';
import {sessionStore} from '@core/session';
import {failure} from '../commerce/commerce.mapper';
import type {
  CatalogueParams,
  CommerceFailure,
  PurchaseParams,
} from '../commerce/commerce.types';
import {isValidCheckoutKey} from '../commerce/commerce.idempotency';
import {
  mapMarketplaceCatalogue,
  mapMarketplaceCategories,
  mapMarketplaceCreateOrder,
  mapMarketplaceDelivery,
  mapMarketplaceFavoriteIds,
  mapMarketplaceFavoriteWrite,
  mapMarketplaceOrderDetail,
  mapMarketplaceOrders,
  mapMarketplaceProductDetail,
  mapMarketplaceReconcile,
} from './marketplace.mapper';

/**
 * Worker Marketplace. Catalogue public ; routes membre en X-Access-Proof.
 * Jamais de route /internal/. Plafond de `ids=` : 100 identifiants.
 */

export const MARKETPLACE_IDS_MAX = 100;

function noProof(): CommerceFailure | null {
  return sessionStore.getAccessProof() ? null : failure('noProof', null);
}

const mp = () => http.service('marketplace');

export async function fetchMarketplaceCatalogue(params: CatalogueParams = {}) {
  const env = await safeEnvelope(
    mp().get('/api/marketplace/catalog', {
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
  return mapMarketplaceCatalogue(env);
}

/** Hydratation (favoris, etc.) : l'ordre demandé est conservé par le Worker. */
export async function fetchMarketplaceByIds(ids: string[]) {
  const clean = ids.filter(id => id !== '').slice(0, MARKETPLACE_IDS_MAX);
  if (clean.length === 0) {
    return {kind: 'success' as const, items: []};
  }
  const env = await safeEnvelope(
    mp().get('/api/marketplace/catalog', {
      auth: 'none',
      query: {ids: clean.join(',')},
    }),
  );
  return mapMarketplaceCatalogue(env);
}

export async function fetchMarketplaceProduct(id: string) {
  if (!id) {
    return failure('validation', null, 'MISSING_ID');
  }
  const env = await safeEnvelope(
    mp().get(`/api/marketplace/catalog/${encodeURIComponent(id)}`, {
      auth: 'none',
    }),
  );
  return mapMarketplaceProductDetail(env);
}

export async function fetchMarketplaceCategories() {
  const env = await safeEnvelope(
    mp().get('/api/marketplace/categories', {auth: 'none'}),
  );
  return mapMarketplaceCategories(env);
}

export async function fetchMarketplaceFavoriteIds() {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  const env = await safeEnvelope(
    mp().get('/api/marketplace/me/favorites', {auth: 'accessProof'}),
  );
  return mapMarketplaceFavoriteIds(env);
}

/** Toujours un JSON valide : un corps invalide donne un 500 (Rapport §11.2). */
export async function addMarketplaceFavorite(listingId: string) {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  if (!listingId) {
    return failure('validation', null, 'MISSING_ID');
  }
  const env = await safeEnvelope(
    mp().post(
      '/api/marketplace/me/favorites',
      {listingId},
      {auth: 'accessProof'},
    ),
  );
  return mapMarketplaceFavoriteWrite(env);
}

export async function removeMarketplaceFavorite(listingId: string) {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  const env = await safeEnvelope(
    mp().delete(
      `/api/marketplace/me/favorites/${encodeURIComponent(listingId)}`,
      {auth: 'accessProof'},
    ),
  );
  return mapMarketplaceFavoriteWrite(env);
}

export async function fetchMarketplaceOrders() {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  const env = await safeEnvelope(
    mp().get('/api/marketplace/me/orders', {auth: 'accessProof'}),
  );
  return mapMarketplaceOrders(env);
}

export async function fetchMarketplaceOrder(id: string) {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  if (!id) {
    return failure('validation', null, 'MISSING_ID');
  }
  const env = await safeEnvelope(
    mp().get(`/api/marketplace/me/orders/${encodeURIComponent(id)}`, {
      auth: 'accessProof',
    }),
  );
  return mapMarketplaceOrderDetail(env);
}

/**
 * POST /api/marketplace/orders. La clé part dans l'en-tête et dans le corps.
 * Un 502 est `indeterminate` : rejouer avec la MÊME clé, jamais une nouvelle.
 */
export async function createMarketplaceOrder(
  params: Pick<PurchaseParams, 'productId' | 'idempotencyKey'>,
) {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  if (!params.productId) {
    return failure('validation', null, 'MISSING_ID');
  }
  if (!isValidCheckoutKey(params.idempotencyKey)) {
    return failure('validation', null, 'INVALID_IDEMPOTENCY_KEY');
  }
  const env = await safeEnvelope(
    mp().post(
      '/api/marketplace/orders',
      {listingId: params.productId, idempotencyKey: params.idempotencyKey},
      {
        auth: 'accessProof',
        headers: {'Idempotency-Key': params.idempotencyKey},
      },
    ),
  );
  return mapMarketplaceCreateOrder(env);
}

export async function reconcileMarketplaceOrder(id: string) {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  if (!id) {
    return failure('validation', null, 'MISSING_ID');
  }
  const env = await safeEnvelope(
    mp().post(
      `/api/marketplace/me/orders/${encodeURIComponent(id)}/reconcile`,
      {},
      {auth: 'accessProof'},
    ),
  );
  return mapMarketplaceReconcile(env);
}

export async function fetchMarketplaceDelivery(orderId: string) {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  if (!orderId) {
    return failure('validation', null, 'MISSING_ID');
  }
  const env = await safeEnvelope(
    mp().get(
      `/api/marketplace/me/orders/${encodeURIComponent(orderId)}/delivery`,
      {auth: 'accessProof'},
    ),
  );
  return mapMarketplaceDelivery(env);
}
