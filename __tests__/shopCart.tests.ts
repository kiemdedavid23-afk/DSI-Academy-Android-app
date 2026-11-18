import {http} from '@core/network';
import {sessionStore} from '@core/session';
import {
  addShopCartItem,
  fetchShopCart,
  previewShopPromo,
  removeShopCartItem,
  replaceShopCart,
} from '@core/api/endpoints/shop/shop.api';
import {cartTotals} from '../src/features/commerce/logic/cart';
import {shopCartStore} from '../src/features/commerce/store/cartStore';
import type {
  CommerceProduct,
} from '../src/features/commerce/store/commerceTypes';
import cartFixture from '../contracts/shop/cart.json';
import promoFixture from '../contracts/shop/promo.json';
import promoConflict from '../contracts/shop/error.409.promo.json';

jest.mock('@core/network', () => ({
  http: {service: jest.fn()},
  safeEnvelope: jest.requireActual('@core/network/envelope').safeEnvelope,
}));
jest.mock('@core/session', () => ({
  sessionStore: {getAccessProof: jest.fn()},
}));
jest.mock('@shared/store', () => ({storeRegistry: {register: jest.fn()}}));

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPut = jest.fn();
const mockDelete = jest.fn();

function res(status: number, body: unknown) {
  return Promise.resolve({
    status,
    ok: status >= 200 && status < 300,
    body,
    bodyKind: 'json' as const,
  });
}

function product(id: string, priceDsi: number): CommerceProduct {
  return {
    source: 'shop',
    id,
    title: id,
    tagline: null,
    description: null,
    category: null,
    priceDsi,
    free: priceDsi === 0,
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

beforeEach(() => {
  [mockGet, mockPost, mockPut, mockDelete].forEach(m => m.mockReset());
  (http.service as jest.Mock).mockReturnValue({
    get: mockGet,
    post: mockPost,
    put: mockPut,
    delete: mockDelete,
  });
  (sessionStore.getAccessProof as jest.Mock).mockReturnValue('proof.sig');
  shopCartStore.reset();
});

describe('Panier Boutique : appels', () => {
  it('lecture : lignes valides seulement (id et quantité ≥ 1)', async () => {
    mockGet.mockReturnValue(res(200, cartFixture));
    const r = await fetchShopCart();
    expect(r.kind === 'success' && r.lines).toEqual([
      {productId: 'prod_abc123', qty: 2},
      {productId: 'prod_def456', qty: 1},
    ]);
    expect(mockGet).toHaveBeenCalledWith('/api/shop/cart', {
      auth: 'accessProof',
    });
  });
  it('sans preuve : échec local, aucun appel réseau', async () => {
    (sessionStore.getAccessProof as jest.Mock).mockReturnValue(null);
    const r = await fetchShopCart();
    expect(r.kind === 'failure' && r.errorKind).toBe('noProof');
    expect(mockGet).not.toHaveBeenCalled();
  });
  it('ajout : quantité 1 par défaut, quantité invalide ramenée à 1', async () => {
    mockPost.mockReturnValue(res(200, cartFixture));
    await addShopCartItem('prod_abc123');
    await addShopCartItem('prod_abc123', 0);
    expect(mockPost).toHaveBeenNthCalledWith(
      1,
      '/api/shop/cart/items',
      {productId: 'prod_abc123', qty: 1},
      {auth: 'accessProof'},
    );
    expect(mockPost).toHaveBeenNthCalledWith(
      2,
      '/api/shop/cart/items',
      {productId: 'prod_abc123', qty: 1},
      {auth: 'accessProof'},
    );
  });
  it('ajout : produit introuvable ou archivé = produit indisponible', async () => {
    mockPost.mockReturnValue(
      res(409, {
        success: false,
        error: 'x',
        code: 'PRODUCT_ARCHIVED',
        data: null,
      }),
    );
    const r = await addShopCartItem('prod_old');
    expect(r.kind === 'failure' && r.errorKind).toBe('productUnavailable');
  });
  it('retrait : identifiant encodé', async () => {
    mockDelete.mockReturnValue(res(200, cartFixture));
    await removeShopCartItem('prod a/1');
    expect(mockDelete).toHaveBeenCalledWith(
      '/api/shop/cart/items/prod%20a%2F1',
      {auth: 'accessProof'},
    );
  });
  it('remplacement : seuls productId et qty partent, jamais de prix', async () => {
    mockPut.mockReturnValue(res(200, cartFixture));
    await replaceShopCart([{productId: 'prod_abc123', qty: 3}]);
    expect(mockPut).toHaveBeenCalledWith(
      '/api/shop/cart',
      {items: [{productId: 'prod_abc123', qty: 3}]},
      {auth: 'accessProof'},
    );
  });
  it('code promo : mis en majuscules, aperçu lu', async () => {
    mockPost.mockReturnValue(res(200, promoFixture));
    const r = await previewShopPromo(' promo10 ');
    expect(r.kind === 'success' && r.promo).toEqual({
      code: 'PROMO10',
      kind: 'percent',
      value: 10,
    });
    expect(mockPost).toHaveBeenCalledWith(
      '/api/shop/promo/validate',
      {code: 'PROMO10'},
      {auth: 'accessProof'},
    );
  });
  it('code promo : vide refusé sans appel, 409 = conflit, 404 = introuvable', async () => {
    const empty = await previewShopPromo('  ');
    expect(empty.kind === 'failure' && empty.code).toBe('MISSING_CODE');
    expect(mockPost).not.toHaveBeenCalled();
    mockPost.mockReturnValueOnce(res(409, promoConflict));
    const c = await previewShopPromo('OLD');
    expect(c.kind === 'failure' && c.errorKind).toBe('conflict');
    mockPost.mockReturnValueOnce(
      res(404, {success: false, error: 'x', code: 'NOT_FOUND', data: null}),
    );
    const n = await previewShopPromo('NOPE');
    expect(n.kind === 'failure' && n.errorKind).toBe('notFound');
  });
});

describe('Panier Boutique : store', () => {
  it('charge le panier serveur', async () => {
    mockGet.mockReturnValue(res(200, cartFixture));
    await shopCartStore.load();
    const s = shopCartStore.getState();
    expect(s.status).toBe('success');
    expect(s.lines).toHaveLength(2);
    expect(shopCartStore.inCart('prod_abc123')).toBe(true);
  });
  it('échec de chargement : état erreur, panier inchangé', async () => {
    mockGet.mockReturnValue(
      res(503, {success: false, error: 'x', code: 'UNAVAILABLE', data: null}),
    );
    await shopCartStore.load();
    expect(shopCartStore.getState().status).toBe('error');
    expect(shopCartStore.getState().errorKind).toBe('unavailable');
  });
  it('ajout : le panier renvoyé par le serveur remplace l’état', async () => {
    mockPost.mockReturnValue(res(200, cartFixture));
    const r = await shopCartStore.add('prod_abc123');
    expect(r.ok).toBe(true);
    expect(shopCartStore.getState().lines).toHaveLength(2);
    expect(shopCartStore.getState().busyId).toBeNull();
  });
  it('ajout refusé : panier inchangé, nature de l’échec rendue', async () => {
    mockPost.mockReturnValue(
      res(404, {
        success: false,
        error: 'x',
        code: 'PRODUCT_NOT_FOUND',
        data: null,
      }),
    );
    const r = await shopCartStore.add('prod_x');
    expect(r).toEqual({ok: false, errorKind: 'productUnavailable'});
    expect(shopCartStore.getState().lines).toEqual([]);
    expect(shopCartStore.getState().busyId).toBeNull();
  });
  it('une seule écriture à la fois : la seconde est ignorée', async () => {
    let release: (v: unknown) => void = () => undefined;
    mockPost.mockReturnValue(new Promise(r => (release = r)));
    const first = shopCartStore.add('prod_a');
    const second = await shopCartStore.add('prod_b');
    expect(second).toEqual({ok: true});
    expect(mockPost).toHaveBeenCalledTimes(1);
    release({
      status: 200,
      ok: true,
      body: cartFixture,
      bodyKind: 'json' as const,
    });
    await first;
  });
  it('quantité 0 = retrait ; sinon remplacement complet', async () => {
    mockGet.mockReturnValue(res(200, cartFixture));
    await shopCartStore.load();
    mockDelete.mockReturnValue(res(200, cartFixture));
    await shopCartStore.setQty('prod_abc123', 0);
    expect(mockDelete).toHaveBeenCalledTimes(1);
    mockPut.mockReturnValue(res(200, cartFixture));
    await shopCartStore.setQty('prod_abc123', 5);
    expect(mockPut).toHaveBeenCalledWith(
      '/api/shop/cart',
      {
        items: [
          {productId: 'prod_abc123', qty: 5},
          {productId: 'prod_def456', qty: 1},
        ],
      },
      {auth: 'accessProof'},
    );
  });
  it('promo : valide puis effacée ; invalide : conflit rendu', async () => {
    mockPost.mockReturnValueOnce(res(200, promoFixture));
    await shopCartStore.previewPromo('promo10');
    expect(shopCartStore.getState().promoStatus).toBe('valid');
    expect(shopCartStore.getState().promo?.code).toBe('PROMO10');
    shopCartStore.clearPromo();
    expect(shopCartStore.getState().promo).toBeNull();
    mockPost.mockReturnValueOnce(res(409, promoConflict));
    const r = await shopCartStore.previewPromo('OLD');
    expect(r).toEqual({ok: false, errorKind: 'conflict'});
    expect(shopCartStore.getState().promoStatus).toBe('invalid');
  });
  it('reset : tout est vidé', async () => {
    mockGet.mockReturnValue(res(200, cartFixture));
    await shopCartStore.load();
    shopCartStore.reset();
    expect(shopCartStore.getState().lines).toEqual([]);
    expect(shopCartStore.getState().status).toBe('idle');
  });
});

describe('Panier Boutique : totaux affichés', () => {
  const products = [product('a', 1000), product('b', 500)];
  it('sous-total, remise en pourcentage arrondie vers le bas, total', () => {
    const t = cartTotals(
      [
        {productId: 'a', qty: 1},
        {productId: 'b', qty: 1},
      ],
      products,
      {code: 'PROMO10', kind: 'percent', value: 10},
    );
    expect(t).toEqual({
      subtotalDsi: 1500,
      discountDsi: 150,
      totalDsi: 1350,
      unknownCount: 0,
      itemCount: 2,
    });
  });
  it('produit inconnu : compté à part, jamais chiffré', () => {
    const t = cartTotals([{productId: 'zzz', qty: 2}], products, null);
    expect(t.subtotalDsi).toBe(0);
    expect(t.unknownCount).toBe(1);
    expect(t.itemCount).toBe(2);
    expect(t.discountDsi).toBeNull();
  });
  it('remise d’un type inconnu : pas d’estimation', () => {
    const t = cartTotals([{productId: 'a', qty: 1}], products, {
      code: 'X',
      kind: 'other',
      value: 200,
    });
    expect(t.discountDsi).toBeNull();
    expect(t.totalDsi).toBe(1000);
  });
  it('remise plafonnée au sous-total', () => {
    const t = cartTotals([{productId: 'a', qty: 1}], products, {
      code: 'BIG',
      kind: 'percent',
      value: 150,
    });
    expect(t.totalDsi).toBe(0);
  });
});
