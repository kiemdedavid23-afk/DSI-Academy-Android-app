import {http} from '@core/network';
import {sessionStore} from '@core/session';
import {
  fetchShopCatalogue,
  fetchShopOrders,
  fetchShopReadUrl,
  shopCheckout,
} from '@core/api/endpoints/shop/shop.api';
import {
  createMarketplaceOrder,
  fetchMarketplaceByIds,
  fetchMarketplaceDelivery,
  reconcileMarketplaceOrder,
} from '@core/api/endpoints/marketplace/marketplace.api';
import shopCheckoutPaid from '../contracts/shop/checkout.paid.json';
import shopCheckoutProcessing from '../contracts/shop/checkout.processing.json';
import shopCatalog from '../contracts/shop/catalog.json';
import shopReadUrl from '../contracts/shop/readurl.json';
import mpPaid from '../contracts/marketplace/order.create.paid.json';
import mpReconcile from '../contracts/marketplace/reconcile.json';
import mpDelivery from '../contracts/marketplace/delivery.json';
import mpCatalog from '../contracts/marketplace/catalog.json';

jest.mock('@core/network', () => ({
  http: {service: jest.fn()},
  safeEnvelope: jest.requireActual('@core/network/envelope').safeEnvelope,
}));
jest.mock('@core/session', () => ({
  sessionStore: {getAccessProof: jest.fn()},
}));

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockDelete = jest.fn();

function res(status: number, body: unknown) {
  return Promise.resolve({
    status,
    ok: status >= 200 && status < 300,
    body,
    bodyKind: 'json' as const,
  });
}

beforeEach(() => {
  mockGet.mockReset();
  mockPost.mockReset();
  mockDelete.mockReset();
  (http.service as jest.Mock).mockReturnValue({
    get: mockGet,
    post: mockPost,
    delete: mockDelete,
  });
  (sessionStore.getAccessProof as jest.Mock).mockReturnValue('proof.sig');
});

const KEY = 'chk_0123456789abcdef';

describe('Boutique : appels', () => {
  it('catalogue public, « all » et recherche vide ne filtrent pas', async () => {
    mockGet.mockReturnValue(res(200, shopCatalog));
    const r = await fetchShopCatalogue({category: 'all', q: ''});
    expect(r.kind).toBe('success');
    expect(http.service).toHaveBeenCalledWith('shop');
    expect(mockGet).toHaveBeenCalledWith('/api/shop/catalog', {
      auth: 'none',
      query: {category: undefined, q: undefined},
    });
  });
  it('route membre sans preuve : échec local, aucun appel réseau', async () => {
    (sessionStore.getAccessProof as jest.Mock).mockReturnValue(null);
    const r = await fetchShopOrders();
    expect(r.kind === 'failure' && r.errorKind).toBe('noProof');
    expect(mockGet).not.toHaveBeenCalled();
  });
  it('checkout : clé dans le corps et l’en-tête, jamais de prix envoyé', async () => {
    mockPost.mockReturnValue(res(200, shopCheckoutPaid));
    const r = await shopCheckout({idempotencyKey: KEY, promoCode: 'PROMO10'});
    expect(r.kind === 'success' && r.order.status).toBe('paid');
    expect(mockPost).toHaveBeenCalledWith(
      '/api/shop/checkout',
      {idempotencyKey: KEY, promoCode: 'PROMO10'},
      {auth: 'accessProof', headers: {'Idempotency-Key': KEY}},
    );
  });
  it('checkout 202 : en cours, la clé n’est pas régénérée par l’API', async () => {
    mockPost.mockReturnValue(res(202, shopCheckoutProcessing));
    const r = await shopCheckout({idempotencyKey: KEY});
    expect(r.kind === 'success' && r.pending).toBe(true);
  });
  it('checkout : clé invalide refusée sans appel', async () => {
    const r = await shopCheckout({idempotencyKey: 'court'});
    expect(r.kind === 'failure' && r.code).toBe('INVALID_IDEMPOTENCY_KEY');
    expect(mockPost).not.toHaveBeenCalled();
  });
  it('checkout : 502 = débit refusé, sans motif', async () => {
    mockPost.mockReturnValue(
      res(502, {success: false, error: 'x', code: 'UPSTREAM', data: null}),
    );
    const r = await shopCheckout({idempotencyKey: KEY});
    expect(r.kind === 'failure' && r.errorKind).toBe('paymentRefused');
  });
  it('réseau coupé : échec réseau, pas d’exception', async () => {
    mockPost.mockRejectedValue(new Error('boom'));
    const r = await shopCheckout({idempotencyKey: KEY});
    expect(r.kind === 'failure' && r.errorKind).toBe('network');
  });
  it('URL de lecture : fileId encodé, corps vide', async () => {
    mockPost.mockReturnValue(res(200, shopReadUrl));
    const r = await fetchShopReadUrl('file asset/1');
    expect(r.kind).toBe('success');
    expect(mockPost).toHaveBeenCalledWith(
      '/api/shop/media/file%20asset%2F1/read-url',
      {},
      {auth: 'accessProof'},
    );
  });
});

describe('Marketplace : appels', () => {
  it('création : clé dans l’en-tête et le corps', async () => {
    mockPost.mockReturnValue(res(200, mpPaid));
    const r = await createMarketplaceOrder({
      productId: 'lst_a1b2c3d4e5f6',
      idempotencyKey: KEY,
    });
    expect(r.kind === 'success' && r.order.orderId).toBe('mp_001');
    expect(mockPost).toHaveBeenCalledWith(
      '/api/marketplace/orders',
      {listingId: 'lst_a1b2c3d4e5f6', idempotencyKey: KEY},
      {auth: 'accessProof', headers: {'Idempotency-Key': KEY}},
    );
  });
  it('création : 502 indéterminé, 403 abonnement, 402 solde', async () => {
    const cases: Array<[number, string, string]> = [
      [502, 'UPSTREAM', 'indeterminate'],
      [403, 'SUBSCRIPTION_INACTIVE', 'subscriptionInactive'],
      [402, 'INSUFFICIENT_BALANCE', 'insufficientBalance'],
    ];
    for (const [status, code, kind] of cases) {
      mockPost.mockReturnValue(
        res(status, {success: false, error: 'x', code, data: null}),
      );
      const r = await createMarketplaceOrder({
        productId: 'lst_x',
        idempotencyKey: KEY,
      });
      expect(r.kind === 'failure' && r.errorKind).toBe(kind);
    }
  });
  it('création : identifiant ou clé invalides refusés sans appel', async () => {
    const a = await createMarketplaceOrder({productId: '', idempotencyKey: KEY});
    const b = await createMarketplaceOrder({
      productId: 'lst_x',
      idempotencyKey: 'court',
    });
    expect(a.kind).toBe('failure');
    expect(b.kind).toBe('failure');
    expect(mockPost).not.toHaveBeenCalled();
  });
  it('vérification : reconcile sans corps utile', async () => {
    mockPost.mockReturnValue(res(200, mpReconcile));
    const r = await reconcileMarketplaceOrder('mp_002');
    expect(r.kind === 'success' && r.order.status).toBe('paid');
    expect(mockPost).toHaveBeenCalledWith(
      '/api/marketplace/me/orders/mp_002/reconcile',
      {},
      {auth: 'accessProof'},
    );
  });
  it('livraison', async () => {
    mockGet.mockReturnValue(res(200, mpDelivery));
    const r = await fetchMarketplaceDelivery('mp_001');
    expect(r.kind === 'success' && r.deliveryUrl).toContain('https://');
  });
  it('ids= : vide = aucun appel, sinon liste jointe et plafonnée à 100', async () => {
    const empty = await fetchMarketplaceByIds([]);
    expect(empty).toEqual({kind: 'success', items: []});
    expect(mockGet).not.toHaveBeenCalled();
    mockGet.mockReturnValue(res(200, mpCatalog));
    const ids = Array.from({length: 130}, (_, i) => `lst_${i}`);
    await fetchMarketplaceByIds(ids);
    const query = mockGet.mock.calls[0][1].query as {ids: string};
    expect(query.ids.split(',')).toHaveLength(100);
  });
});
