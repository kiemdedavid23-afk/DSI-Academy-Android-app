import {parseEnvelope} from '@core/network/envelope';
import type {EnvelopeResult} from '@core/network';
import {
  checkEnvelope,
  failureFromEnvelope,
  normalizeOrderStatus,
} from '@core/api/endpoints/commerce/commerce.mapper';
import {
  createCheckoutKey,
  isValidCheckoutKey,
} from '@core/api/endpoints/commerce/commerce.idempotency';
import {
  mapShopCatalogue,
  mapShopCategories,
  mapShopCheckout,
  mapShopFavoriteIds,
  mapShopLibrary,
  mapShopOrderDetail,
  mapShopOrders,
  mapShopProductDetail,
  mapShopReadUrl,
} from '@core/api/endpoints/shop/shop.mapper';
import {
  mapMarketplaceCatalogue,
  mapMarketplaceCategories,
  mapMarketplaceCreateOrder,
  mapMarketplaceDelivery,
  mapMarketplaceFavoriteIds,
  mapMarketplaceOrderDetail,
  mapMarketplaceOrders,
  mapMarketplaceProductDetail,
  mapMarketplaceReconcile,
} from '@core/api/endpoints/marketplace/marketplace.mapper';
import shopCatalog from '../contracts/shop/catalog.json';
import shopProduct from '../contracts/shop/product.json';
import shopCategories from '../contracts/shop/categories.json';
import shopFavorites from '../contracts/shop/favorites.json';
import shopOrders from '../contracts/shop/orders.json';
import shopOrderFailed from '../contracts/shop/order.failed.json';
import shopCheckoutPaid from '../contracts/shop/checkout.paid.json';
import shopCheckoutProcessing from '../contracts/shop/checkout.processing.json';
import shopLibrary from '../contracts/shop/library.json';
import shopReadUrl from '../contracts/shop/readurl.json';
import shopE404 from '../contracts/shop/error.404.notFound.json';
import shopE401 from '../contracts/shop/error.401.proofExpired.json';
import mpCatalog from '../contracts/marketplace/catalog.json';
import mpProduct from '../contracts/marketplace/product.json';
import mpCategories from '../contracts/marketplace/categories.json';
import mpFavorites from '../contracts/marketplace/favorites.json';
import mpOrders from '../contracts/marketplace/orders.json';
import mpOrderDetail from '../contracts/marketplace/order.detail.json';
import mpPaid from '../contracts/marketplace/order.create.paid.json';
import mpProcessing from '../contracts/marketplace/order.create.processing.json';
import mpReconcile from '../contracts/marketplace/reconcile.json';
import mpAlreadyPaid from '../contracts/marketplace/reconcile.alreadyPaid.json';
import mpDelivery from '../contracts/marketplace/delivery.json';

function env(status: number, body: unknown): EnvelopeResult {
  return parseEnvelope({
    status,
    ok: status >= 200 && status < 300,
    body,
    bodyKind: 'json',
  });
}

const bare = (status: number, code: string | null): EnvelopeResult => ({
  success: false,
  error: null,
  code,
  data: null,
  status,
});

describe('échecs communs : décidés par le code puis le statut', () => {
  it('ACCESS_PROOF_* → unauthorized, quel que soit le statut', () => {
    expect(
      failureFromEnvelope(bare(401, 'ACCESS_PROOF_EXPIRED'), 'shop').errorKind,
    ).toBe('unauthorized');
    expect(
      failureFromEnvelope(bare(500, 'ACCESS_PROOF_INVALID'), 'marketplace')
        .errorKind,
    ).toBe('unauthorized');
  });
  it('codes métier', () => {
    const k = (code: string, status = 403) =>
      failureFromEnvelope(bare(status, code), 'marketplace').errorKind;
    expect(k('ACCOUNT_ACCESS_DENIED')).toBe('accountDenied');
    expect(k('SUBSCRIPTION_INACTIVE')).toBe('subscriptionInactive');
    expect(k('INSUFFICIENT_BALANCE', 402)).toBe('insufficientBalance');
    expect(k('PAYMENT_REJECTED', 402)).toBe('paymentRefused');
    expect(k('LISTING_PRIVATE')).toBe('productUnavailable');
    expect(k('PRODUCT_ARCHIVED', 409)).toBe('productUnavailable');
    expect(k('SELF_PURCHASE_FORBIDDEN')).toBe('selfPurchase');
    expect(k('PAYMENT_RECONCILIATION_PENDING', 409)).toBe(
      'reconciliationPending',
    );
    expect(k('ENTITLEMENT_ASSET_UNAVAILABLE', 409)).toBe(
      'entitlementUnavailable',
    );
  });
  it('statuts sans code connu', () => {
    const k = (status: number) =>
      failureFromEnvelope(bare(status, null), 'shop').errorKind;
    expect(k(0)).toBe('network');
    expect(k(403)).toBe('forbidden');
    expect(k(404)).toBe('notFound');
    expect(k(409)).toBe('conflict');
    expect(k(422)).toBe('validation');
    expect(k(429)).toBe('unavailable');
    expect(k(503)).toBe('unavailable');
    expect(k(502)).toBe('upstream');
    expect(k(500)).toBe('server');
  });
  it('502 à l’achat : Boutique = refus, Marketplace = indéterminé', () => {
    expect(
      failureFromEnvelope(bare(502, 'UPSTREAM'), 'shop', 'purchase').errorKind,
    ).toBe('paymentRefused');
    expect(
      failureFromEnvelope(bare(502, 'UPSTREAM'), 'marketplace', 'purchase')
        .errorKind,
    ).toBe('indeterminate');
  });
  it('checkEnvelope : succès seulement si success vrai et 2xx', () => {
    expect(checkEnvelope(env(200, shopCategories), 'shop')).toBeNull();
    expect(checkEnvelope(env(200, {success: false}), 'shop')).not.toBeNull();
    expect(checkEnvelope(env(404, shopE404), 'shop')?.errorKind).toBe(
      'notFound',
    );
  });
  it('statuts unifiés : l’inconnu reste « en cours »', () => {
    expect(normalizeOrderStatus('paid')).toBe('paid');
    expect(normalizeOrderStatus('failed')).toBe('failed');
    expect(normalizeOrderStatus('refunded')).toBe('refunded');
    expect(normalizeOrderStatus('payment_unknown')).toBe('processing');
    expect(normalizeOrderStatus('validating')).toBe('processing');
    expect(normalizeOrderStatus('quelque_chose')).toBe('processing');
    expect(normalizeOrderStatus(undefined)).toBe('processing');
  });
});

describe('clé d’idempotence', () => {
  it('générée : valide, distincte à chaque appel', () => {
    const a = createCheckoutKey();
    const b = createCheckoutKey();
    expect(isValidCheckoutKey(a)).toBe(true);
    expect(a.startsWith('chk_')).toBe(true);
    expect(a).not.toBe(b);
  });
  it('bornes 8 à 128 et caractères sûrs', () => {
    expect(isValidCheckoutKey('1234567')).toBe(false);
    expect(isValidCheckoutKey('12345678')).toBe(true);
    expect(isValidCheckoutKey('a'.repeat(128))).toBe(true);
    expect(isValidCheckoutKey('a'.repeat(129))).toBe(false);
    expect(isValidCheckoutKey('clé invalide !')).toBe(false);
    expect(isValidCheckoutKey(42)).toBe(false);
  });
});

describe('Boutique : mappers', () => {
  it('catalogue : écarte sans prix et non publiés, couverture https', () => {
    const r = mapShopCatalogue(env(200, shopCatalog));
    expect(r.kind).toBe('success');
    if (r.kind !== 'success') {
      return;
    }
    expect(r.items.map(p => p.id)).toEqual(['prod_abc123', 'prod_def456']);
    expect(r.items[0].coverUrl).toBe('https://i.ibb.co/abc123/cover1.jpg');
    expect(r.items[0].source).toBe('shop');
    expect(r.items[1].coverUrl).toBeNull();
    expect(r.items[1].free).toBe(true);
    expect(r.items[1].featured).toBe(true);
    expect(r.items[1].badge).toBe('Nouveau');
  });
  it('détail et 404', () => {
    const ok = mapShopProductDetail(env(200, shopProduct));
    expect(ok.kind === 'success' && ok.product.priceDsi).toBe(1500);
    const ko = mapShopProductDetail(env(404, shopE404));
    expect(ko.kind === 'failure' && ko.errorKind).toBe('notFound');
  });
  it('catégories et favoris', () => {
    const c = mapShopCategories(env(200, shopCategories));
    expect(c.kind === 'success' && c.categories[0]).toEqual({
      slug: 'formations',
      count: 12,
    });
    const f = mapShopFavoriteIds(env(200, shopFavorites));
    expect(f.kind === 'success' && f.ids).toEqual([
      'prod_abc123',
      'prod_def456',
    ]);
  });
  it('commandes : statuts unifiés, date en ms, ligne invalide écartée', () => {
    const r = mapShopOrders(env(200, shopOrders));
    expect(r.kind).toBe('success');
    if (r.kind !== 'success') {
      return;
    }
    expect(r.orders).toHaveLength(2);
    expect(r.orders[0].status).toBe('paid');
    expect(r.orders[0].discountDsi).toBe(150);
    expect(r.orders[0].createdAt).toBe(1763424000000);
    expect(r.orders[1].status).toBe('processing');
    expect(r.orders[1].rawStatus).toBe('payment_unknown');
    expect(r.orders[0].items[0].productId).toBe('prod_abc123');
  });
  it('détail de commande échouée', () => {
    const r = mapShopOrderDetail(env(200, shopOrderFailed));
    expect(r.kind === 'success' && r.order.status).toBe('failed');
    expect(r.kind === 'success' && r.order.failureReason).toBe('DEBIT_REFUSED');
  });
  it('checkout : 200 payé, 202 en cours', () => {
    const paid = mapShopCheckout(env(200, shopCheckoutPaid));
    expect(paid.kind === 'success' && paid.pending).toBe(false);
    expect(paid.kind === 'success' && paid.order.status).toBe('paid');
    expect(paid.kind === 'success' && paid.order.totalDsi).toBe(1350);
    const wait = mapShopCheckout(env(202, shopCheckoutProcessing));
    expect(wait.kind === 'success' && wait.pending).toBe(true);
    expect(wait.kind === 'success' && wait.order.status).toBe('processing');
    expect(wait.kind === 'success' && wait.order.note).toBe(
      'Paiement en cours de vérification',
    );
  });
  it('checkout : 401 et 502', () => {
    const e401 = mapShopCheckout(env(401, shopE401));
    expect(e401.kind === 'failure' && e401.errorKind).toBe('unauthorized');
    const e502 = mapShopCheckout(
      env(502, {success: false, error: 'x', code: 'UPSTREAM', data: null}),
    );
    expect(e502.kind === 'failure' && e502.errorKind).toBe('paymentRefused');
  });
  it('bibliothèque : assetFileId conservé tel quel', () => {
    const r = mapShopLibrary(env(200, shopLibrary));
    expect(r.kind).toBe('success');
    if (r.kind !== 'success') {
      return;
    }
    expect(r.items).toHaveLength(1);
    expect(r.items[0].assetFileId).toBe('file_asset_1');
    expect(r.items[0].hasAsset).toBe(true);
  });
  it('URL de lecture : https seulement', () => {
    const ok = mapShopReadUrl(env(200, shopReadUrl));
    expect(ok.kind === 'success' && ok.url).toBe(
      'https://storage.example.invalid/read/abc?sig=1',
    );
    const ko = mapShopReadUrl(
      env(200, {success: true, data: {url: 'http://x.invalid/a'}}),
    );
    expect(ko.kind === 'failure' && ko.errorKind).toBe('invalidResponse');
  });
});

describe('Marketplace : mappers', () => {
  it('catalogue : PRIVATE et non publiés écartés, vignette http refusée', () => {
    const r = mapMarketplaceCatalogue(env(200, mpCatalog));
    expect(r.kind).toBe('success');
    if (r.kind !== 'success') {
      return;
    }
    expect(r.items.map(p => p.id)).toEqual([
      'lst_a1b2c3d4e5f6',
      'lst_free00000001',
    ]);
    const first = r.items[0];
    expect(first.source).toBe('marketplace');
    expect(first.coverUrl).toBe('https://drive.example.invalid/uc?id=1');
    expect(first.storeName).toBe('Atelier Awa');
    expect(first.salesCount).toBe(12);
    expect(first.reviewAvg).toBe(4.5);
    expect(first.reviewCount).toBe(6);
    expect(first.favoritesCount).toBe(9);
    expect(r.items[1].free).toBe(true);
    expect(r.items[1].coverUrl).toBeNull();
  });
  it('détail : produit à plat dans data, privé = introuvable', () => {
    const a = mapMarketplaceProductDetail(env(200, mpProduct));
    expect(a.kind === 'success' && a.product.title).toBe('Pack modèles');
    const c = mapMarketplaceProductDetail(
      env(200, {
        success: true,
        data: {...mpProduct.data, visibility: 'PRIVATE'},
      }),
    );
    expect(c.kind === 'failure' && c.errorKind).toBe('notFound');
  });
  it('catégories et favoris', () => {
    const c = mapMarketplaceCategories(env(200, mpCategories));
    expect(c.kind === 'success' && c.categories).toHaveLength(2);
    const f = mapMarketplaceFavoriteIds(env(200, mpFavorites));
    expect(f.kind === 'success' && f.ids[0]).toBe('lst_a1b2c3d4e5f6');
  });
  it('commandes : un article, statuts unifiés', () => {
    const r = mapMarketplaceOrders(env(200, mpOrders));
    expect(r.kind).toBe('success');
    if (r.kind !== 'success') {
      return;
    }
    expect(r.orders).toHaveLength(2);
    expect(r.orders[0].status).toBe('paid');
    expect(r.orders[0].items).toEqual([
      {productId: 'lst_a1b2c3d4e5f6', title: 'Pack modèles', qty: 1},
    ]);
    expect(r.orders[1].status).toBe('processing');
    expect(r.orders[1].rawStatus).toBe('pending_payment');
    const d = mapMarketplaceOrderDetail(env(200, mpOrderDetail));
    expect(d.kind === 'success' && d.order.paymentRef).toBe('ref_1');
  });
  it('création : payée ou en cours (rejeu)', () => {
    const paid = mapMarketplaceCreateOrder(env(200, mpPaid));
    expect(paid.kind === 'success' && paid.pending).toBe(false);
    expect(paid.kind === 'success' && paid.order.orderId).toBe('mp_001');
    const wait = mapMarketplaceCreateOrder(env(200, mpProcessing));
    expect(wait.kind === 'success' && wait.pending).toBe(true);
    expect(wait.kind === 'success' && wait.order.replay).toBe(true);
  });
  it('création : 502 = indéterminé, 402 = solde insuffisant', () => {
    const e502 = mapMarketplaceCreateOrder(
      env(502, {success: false, error: 'x', code: 'UPSTREAM', data: null}),
    );
    expect(e502.kind === 'failure' && e502.errorKind).toBe('indeterminate');
    const e402 = mapMarketplaceCreateOrder(
      env(402, {
        success: false,
        error: 'x',
        code: 'INSUFFICIENT_BALANCE',
        data: null,
      }),
    );
    expect(e402.kind === 'failure' && e402.errorKind).toBe(
      'insufficientBalance',
    );
  });
  it('vérification : reconcile et alreadyPaid', () => {
    const r = mapMarketplaceReconcile(env(200, mpReconcile));
    expect(r.kind === 'success' && r.order.status).toBe('paid');
    const a = mapMarketplaceReconcile(env(200, mpAlreadyPaid));
    expect(a.kind === 'success' && a.order.status).toBe('paid');
  });
  it('livraison : lien https obligatoire', () => {
    const ok = mapMarketplaceDelivery(env(200, mpDelivery));
    expect(ok.kind === 'success' && ok.deliveryUrl).toBe(
      'https://vendeur.example.invalid/acces/abc',
    );
    const ko = mapMarketplaceDelivery(
      env(200, {
        success: true,
        data: {...mpDelivery.data, deliveryUrl: 'http://x.invalid/a'},
      }),
    );
    expect(ko.kind === 'failure' && ko.errorKind).toBe('invalidResponse');
    const e503 = mapMarketplaceDelivery(
      env(503, {
        success: false,
        error: 'x',
        code: 'UNAVAILABLE',
        data: null,
      }),
    );
    expect(e503.kind === 'failure' && e503.errorKind).toBe('unavailable');
  });
});
