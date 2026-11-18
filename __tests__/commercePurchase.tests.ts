import {COMMERCE_STORES} from '../src/features/commerce/store/commerceStores';
import {
  accessErrorKey,
  orderStatusKey,
  purchaseErrorKey,
} from '../src/features/commerce/logic/errorKey';
import {isAllowedLinkUrl} from '../src/features/commerce/logic/linkFilter';
import type {CommerceProduct} from '../src/features/commerce/store/commerceTypes';

jest.mock('@shared/store', () => ({storeRegistry: {register: jest.fn()}}));
jest.mock('@core/api/endpoints/payment/membre.api', () => ({
  fetchMemberBalance: jest.fn(),
}));
jest.mock('@core/api/endpoints/commerce/commerce.sources', () => {
  const api = {
    purchase: jest.fn(),
    verifyOrder: jest.fn(),
    fetchOrders: jest.fn(),
    access: jest.fn(),
    fetchCatalogue: jest.fn(),
    fetchProduct: jest.fn(),
    fetchCategories: jest.fn(),
    fetchFavoriteIds: jest.fn(),
    addFavorite: jest.fn(),
    removeFavorite: jest.fn(),
    fetchProductsByIds: jest.fn(),
  };
  return {getCommerceApi: () => api, __api: api};
});

const api = jest.requireMock('@core/api/endpoints/commerce/commerce.sources')
  .__api as Record<string, jest.Mock>;
const fetchMemberBalance = jest.requireMock('@core/api/endpoints/payment/membre.api')
  .fetchMemberBalance as jest.Mock;
const st = COMMERCE_STORES.marketplace;
const P = st.purchase;

function product(id: string): CommerceProduct {
  return {
    source: 'marketplace',
    id,
    title: id,
    tagline: null,
    description: null,
    category: null,
    priceDsi: 100,
    free: false,
    coverUrl: null,
    badge: null,
    featured: false,
    hasAsset: true,
    sellerId: null,
    storeName: null,
    reviewAvg: null,
    reviewCount: 0,
    salesCount: 0,
    favoritesCount: 0,
  };
}

const state = (orderId: string, status: string) => ({
  orderId,
  status,
  rawStatus: status,
  totalDsi: 100,
  replay: false,
  note: null,
});
const paid = {kind: 'success', order: state('mp_1', 'paid'), pending: false};
const waiting = {kind: 'success', order: state('mp_2', 'processing'), pending: true};
const fail = (errorKind: string) => ({kind: 'failure', errorKind, status: 0, code: null});

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>(r => {
    resolve = r;
  });
  return {promise, resolve};
}

const keysSent = () => api.purchase.mock.calls.map(c => c[0].idempotencyKey);

beforeEach(() => {
  Object.values(api).forEach(fn => fn.mockReset());
  fetchMemberBalance.mockReset();
  fetchMemberBalance.mockResolvedValue({
    kind: 'success',
    data: {identifiantDsi: 'x', soldeDsiActuel: 500, totalDsiGagnes: 0},
  });
  api.fetchOrders.mockResolvedValue({kind: 'success', orders: []});
  P.reset();
  st.orders.reset();
  st.balance.reset();
});

describe('achat commun', () => {
  it('payé : la clé est créée à l’ouverture et envoyée telle quelle', async () => {
    api.purchase.mockResolvedValue(paid);
    P.start(product('p1'));
    const key = P.getState().key;
    expect(key?.startsWith('chk_')).toBe(true);
    await P.confirm();
    expect(P.getState().phase).toBe('paid');
    expect(keysSent()).toEqual([key]);
  });
  it('en cours, vérification sans réponse, puis payé', async () => {
    api.purchase.mockResolvedValue(waiting);
    P.start(product('p2'));
    await P.confirm();
    expect(P.getState().phase).toBe('pending');
    api.verifyOrder.mockResolvedValueOnce(fail('network'));
    await P.verify();
    expect(P.getState().phase).toBe('pending');
    expect(P.getState().verifyFailed).toBe(true);
    api.verifyOrder.mockResolvedValueOnce({kind: 'success', order: state('mp_2', 'paid')});
    await P.verify();
    expect(P.getState().phase).toBe('paid');
    expect(P.getState().verifying).toBe(false);
  });
  it('résultat incertain : même clé à chaque rejeu (jamais de second débit)', async () => {
    P.start(product('p3'));
    const key = P.getState().key;
    api.purchase.mockResolvedValueOnce(fail('indeterminate'));
    await P.confirm();
    expect(P.getState().phase).toBe('indeterminate');
    api.purchase.mockResolvedValueOnce(fail('network'));
    await P.confirm();
    expect(P.getState().phase).toBe('indeterminate');
    api.purchase.mockResolvedValueOnce(paid);
    await P.confirm();
    expect(P.getState().phase).toBe('paid');
    expect(keysSent()).toEqual([key, key, key]);
  });
  it('échec net : nouvelle clé au nouvel essai', async () => {
    P.start(product('p4'));
    const first = P.getState().key;
    api.purchase.mockResolvedValueOnce(fail('paymentRefused'));
    await P.confirm();
    expect(P.getState().phase).toBe('failed');
    expect(P.getState().errorKind).toBe('paymentRefused');
    P.retry();
    expect(P.getState().phase).toBe('confirming');
    expect(P.getState().key).not.toBe(first);
  });
  it('abonnement inactif et solde insuffisant sont des échecs nets', async () => {
    P.start(product('p5'));
    api.purchase.mockResolvedValueOnce(fail('subscriptionInactive'));
    await P.confirm();
    expect(P.getState().phase).toBe('failed');
    expect(P.getState().errorKind).toBe('subscriptionInactive');
    P.dismiss();
    P.start(product('p5'));
    api.purchase.mockResolvedValueOnce(fail('insufficientBalance'));
    await P.confirm();
    expect(P.getState().errorKind).toBe('insufficientBalance');
  });
  it('un second appui pendant l’achat est ignoré', async () => {
    const slow = deferred<typeof paid>();
    api.purchase.mockReturnValue(slow.promise);
    P.start(product('p6'));
    const first = P.confirm();
    await P.confirm();
    slow.resolve(paid);
    await first;
    expect(api.purchase).toHaveBeenCalledTimes(1);
  });
  it('payé : commandes et solde rechargés, commandes triées du plus récent', async () => {
    api.fetchOrders.mockResolvedValue({
      kind: 'success',
      orders: [
        {id: 'o1', status: 'paid', createdAt: 1, items: [], totalDsi: 1},
        {id: 'o2', status: 'paid', createdAt: 9, items: [], totalDsi: 1},
      ],
    });
    api.purchase.mockResolvedValue(paid);
    P.start(product('p7'));
    await P.confirm();
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(api.fetchOrders).toHaveBeenCalled();
    expect(st.balance.getState().amount).toBe(500);
    expect(st.orders.getState().items.map(o => o.id)).toEqual(['o2', 'o1']);
  });
});

describe('mes achats et accès', () => {
  it('vérifier une commande met son statut à jour', async () => {
    api.fetchOrders.mockResolvedValue({
      kind: 'success',
      orders: [{id: 'o1', status: 'processing', rawStatus: 'processing', createdAt: 1, items: [], totalDsi: 1}],
    });
    await st.orders.load({force: true});
    api.verifyOrder.mockResolvedValue({kind: 'success', order: state('o1', 'paid')});
    await st.orders.verify('o1');
    expect(st.orders.getState().items[0].status).toBe('paid');
    expect(st.orders.getState().verifyingId).toBeNull();
  });
  it('accès : succès et échec', async () => {
    api.access.mockResolvedValueOnce({kind: 'success', url: 'https://x.invalid/a', mode: 'webview'});
    expect(await st.orders.access({orderId: 'o1', productId: null})).toEqual({
      ok: true,
      url: 'https://x.invalid/a',
      mode: 'webview',
    });
    api.access.mockResolvedValueOnce(fail('entitlementUnavailable'));
    expect(await st.orders.access({orderId: 'o1', productId: 'p'})).toEqual({
      ok: false,
      errorKind: 'entitlementUnavailable',
    });
  });
  it('solde illisible : état erreur, l’achat reste possible', async () => {
    fetchMemberBalance.mockResolvedValue({kind: 'failure', errorKind: 'network'});
    await st.balance.load({force: true});
    expect(st.balance.getState().status).toBe('error');
  });
});

describe('logique des écrans d’achat', () => {
  it('messages d’achat', () => {
    expect(purchaseErrorKey('subscriptionInactive')).toBe('mp.checkout.errors.subscription');
    expect(purchaseErrorKey('insufficientBalance')).toBe('mp.checkout.errors.insufficient');
    expect(purchaseErrorKey('paymentRefused')).toBe('commerce.paymentRefused');
    expect(purchaseErrorKey('network')).toBe('app.catalogue.errorNetwork');
  });
  it('messages d’accès', () => {
    expect(accessErrorKey('network')).toBe('mp.orders.accessErrors.network');
    expect(accessErrorKey('noProof')).toBe('mp.orders.accessErrors.session');
    expect(accessErrorKey('entitlementUnavailable')).toBe('mp.orders.accessErrors.unavailable');
    expect(accessErrorKey('conflict')).toBe('mp.orders.accessErrors.unpaid');
    expect(accessErrorKey('server')).toBe('mp.orders.accessErrors.unknown');
  });
  it('statut d’une commande', () => {
    expect(orderStatusKey('paid', 'paid')).toBe('mp.status.paid');
    expect(orderStatusKey('processing', 'pending_payment')).toBe('mp.status.pending_payment');
    expect(orderStatusKey('processing', 'processing')).toBe('mp.status.processing');
    expect(orderStatusKey('failed', 'failed')).toBe('mp.status.failed');
    expect(orderStatusKey('refunded', null)).toBe('commerce.refunded');
  });
  it('lien d’accès : https seulement', () => {
    expect(isAllowedLinkUrl('https://vendeur.invalid/a')).toBe(true);
    expect(isAllowedLinkUrl('about:blank')).toBe(true);
    expect(isAllowedLinkUrl('http://vendeur.invalid')).toBe(false);
    expect(isAllowedLinkUrl('javascript:alert(1)')).toBe(false);
    expect(isAllowedLinkUrl('intent://x')).toBe(false);
    expect(isAllowedLinkUrl(null)).toBe(false);
  });
});
