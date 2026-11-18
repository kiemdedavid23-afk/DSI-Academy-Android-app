import {COMMERCE_STORES} from '../src/features/commerce/store/commerceStores';
import {shopCartStore} from '../src/features/commerce/store/cartStore';
import {cartPurchaseErrorKey} from '../src/features/commerce/logic/errorKey';
import {cartCheckoutProduct} from '../src/features/commerce/logic/cart';
import type {CommerceProduct} from '../src/features/commerce/store/commerceTypes';

jest.mock('@shared/store', () => ({storeRegistry: {register: jest.fn()}}));
jest.mock('@core/api/endpoints/payment/membre.api', () => ({
  fetchMemberBalance: jest.fn(),
}));
jest.mock('@core/api/endpoints/shop/shop.api', () => ({
  fetchShopCart: jest.fn(),
  addShopCartItem: jest.fn(),
  removeShopCartItem: jest.fn(),
  replaceShopCart: jest.fn(),
  previewShopPromo: jest.fn(),
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
const cartApi = jest.requireMock('@core/api/endpoints/shop/shop.api') as Record<
  string,
  jest.Mock
>;
const balance = jest.requireMock('@core/api/endpoints/payment/membre.api')
  .fetchMemberBalance as jest.Mock;
const purchase = COMMERCE_STORES.shop.purchase;

function product(id: string, priceDsi: number): CommerceProduct {
  // Un vrai produit par id (cartCheckoutProduct renvoie toujours l'id « cart »).
  return {...cartCheckoutProduct(id, priceDsi), id, hasAsset: true};
}

beforeEach(() => {
  Object.values(api).forEach(m => m.mockReset());
  Object.values(cartApi).forEach(m => m.mockReset());
  balance.mockReset();
  balance.mockResolvedValue({kind: 'success', data: {soldeDsiActuel: 5000}});
  api.fetchOrders.mockResolvedValue({kind: 'success', orders: []});
  purchase.reset();
  shopCartStore.reset();
});

const paid = {
  kind: 'success',
  pending: false,
  order: {
    orderId: 'shop_1',
    status: 'paid',
    rawStatus: 'paid',
    totalDsi: 1350,
    replay: false,
    note: null,
  },
};

describe('Paiement du panier Boutique', () => {
  it('le code promo et la clé partent au checkout, jamais un prix', async () => {
    api.purchase.mockResolvedValue(paid);
    purchase.start(cartCheckoutProduct('Mon panier', 1500), {
      promoCode: 'PROMO10',
      cart: true,
    });
    const key = purchase.getState().key as string;
    await purchase.confirm();
    expect(api.purchase).toHaveBeenCalledWith({
      productId: 'cart',
      idempotencyKey: key,
      promoCode: 'PROMO10',
    });
    expect(purchase.getState().phase).toBe('paid');
    expect(purchase.getState().cart).toBe(true);
  });
  it('sans options : pas de code promo, pas de mode panier', async () => {
    purchase.start(product('x', 10));
    expect(purchase.getState().promoCode).toBeNull();
    expect(purchase.getState().cart).toBe(false);
  });
  it('résultat incertain : la MÊME clé est rejouée', async () => {
    api.purchase
      .mockResolvedValueOnce({
        kind: 'failure',
        errorKind: 'network',
        status: 0,
        code: null,
      })
      .mockResolvedValueOnce(paid);
    purchase.start(product('x', 10), {promoCode: 'PROMO10', cart: true});
    await purchase.confirm();
    expect(purchase.getState().phase).toBe('indeterminate');
    await purchase.confirm();
    const [first, second] = api.purchase.mock.calls;
    expect(second[0].idempotencyKey).toBe(first[0].idempotencyKey);
    expect(second[0].promoCode).toBe('PROMO10');
  });
  it('refus net : nouvel essai = nouvelle clé, code promo et mode conservés', async () => {
    api.purchase.mockResolvedValue({
      kind: 'failure',
      errorKind: 'paymentRefused',
      status: 502,
      code: 'UPSTREAM',
    });
    purchase.start(product('x', 10), {promoCode: 'PROMO10', cart: true});
    const firstKey = purchase.getState().key;
    await purchase.confirm();
    expect(purchase.getState().phase).toBe('failed');
    purchase.retry();
    const s = purchase.getState();
    expect(s.phase).toBe('confirming');
    expect(s.key).not.toBe(firstKey);
    expect(s.promoCode).toBe('PROMO10');
    expect(s.cart).toBe(true);
  });
});

describe('Messages d’échec du panier', () => {
  it('404/409 avec code promo : code refusé ; sans code : message générique', () => {
    expect(cartPurchaseErrorKey('conflict', true)).toBe(
      'commerce.cart.errors.promo',
    );
    expect(cartPurchaseErrorKey('notFound', true)).toBe(
      'commerce.cart.errors.promo',
    );
    expect(cartPurchaseErrorKey('conflict', false)).toBe(
      'app.catalogue.errorGeneric',
    );
  });
  it('article indisponible, panier vide, paiement à vérifier', () => {
    expect(cartPurchaseErrorKey('productUnavailable', false)).toBe(
      'commerce.cart.errors.product',
    );
    expect(cartPurchaseErrorKey('validation', false)).toBe(
      'commerce.cart.errors.empty',
    );
    expect(cartPurchaseErrorKey('reconciliationPending', false)).toBe(
      'commerce.cart.errors.reconciliation',
    );
  });
  it('autres échecs : messages d’achat communs', () => {
    expect(cartPurchaseErrorKey('paymentRefused', true)).toBe(
      'commerce.paymentRefused',
    );
    expect(cartPurchaseErrorKey('network', false)).toBe(
      'app.catalogue.errorNetwork',
    );
  });
});

describe('Produit fictif du panier', () => {
  it('porte le titre et le montant, sans fichier', () => {
    const p = cartCheckoutProduct('Mon panier', 1350);
    expect(p).toMatchObject({
      source: 'shop',
      id: 'cart',
      title: 'Mon panier',
      priceDsi: 1350,
      free: false,
      hasAsset: false,
    });
    expect(cartCheckoutProduct('x', 0).free).toBe(true);
  });
});

describe('Produits des lignes du panier', () => {
  const lines = {
    kind: 'success',
    lines: [
      {productId: 'a', qty: 1},
      {productId: 'b', qty: 2},
    ],
  };
  it('lit les produits manquants avec le catalogue déjà connu', async () => {
    cartApi.fetchShopCart.mockResolvedValue(lines);
    await shopCartStore.load();
    api.fetchProductsByIds.mockResolvedValue({
      kind: 'success',
      items: [product('a', 100), product('b', 200)],
    });
    const known = [product('a', 100)];
    await shopCartStore.hydrate(known);
    expect(api.fetchProductsByIds).toHaveBeenCalledWith({
      ids: ['a', 'b'],
      known,
    });
    expect(shopCartStore.getState().productsStatus).toBe('success');
    expect(shopCartStore.getState().products).toHaveLength(2);
  });
  it('tout est déjà connu : aucun nouvel appel', async () => {
    cartApi.fetchShopCart.mockResolvedValue(lines);
    await shopCartStore.load();
    api.fetchProductsByIds.mockResolvedValue({
      kind: 'success',
      items: [product('a', 100), product('b', 200)],
    });
    await shopCartStore.hydrate();
    await shopCartStore.hydrate();
    expect(api.fetchProductsByIds).toHaveBeenCalledTimes(1);
  });
  it('échec de lecture : état erreur, nature rendue', async () => {
    cartApi.fetchShopCart.mockResolvedValue(lines);
    await shopCartStore.load();
    api.fetchProductsByIds.mockResolvedValue({
      kind: 'failure',
      errorKind: 'network',
      status: 0,
      code: null,
    });
    await shopCartStore.hydrate();
    expect(shopCartStore.getState().productsStatus).toBe('error');
    expect(shopCartStore.getState().productsErrorKind).toBe('network');
  });
});
