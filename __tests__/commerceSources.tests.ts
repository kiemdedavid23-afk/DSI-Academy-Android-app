import {http} from '@core/network';
import {sessionStore} from '@core/session';
import {getCommerceApi} from '@core/api/endpoints/commerce/commerce.sources';
import type {CommerceProduct} from '@core/api/endpoints/commerce/commerce.types';
import shopProduct from '../contracts/shop/product.json';
import shopOrderFailed from '../contracts/shop/order.failed.json';
import shopCheckoutPaid from '../contracts/shop/checkout.paid.json';
import shopE404 from '../contracts/shop/error.404.notFound.json';
import mpCatalog from '../contracts/marketplace/catalog.json';
import mpReconcile from '../contracts/marketplace/reconcile.json';
import mpPaid from '../contracts/marketplace/order.create.paid.json';
import mpDelivery from '../contracts/marketplace/delivery.json';
import shopLibrary from '../contracts/shop/library.json';
import shopReadUrl from '../contracts/shop/readurl.json';

jest.mock('@core/network', () => ({
  http: {service: jest.fn()},
  safeEnvelope: jest.requireActual('@core/network/envelope').safeEnvelope,
}));
jest.mock('@core/session', () => ({
  sessionStore: {getAccessProof: jest.fn()},
}));

const mockGet = jest.fn();
const mockPost = jest.fn();

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
  (http.service as jest.Mock).mockReturnValue({get: mockGet, post: mockPost});
  (sessionStore.getAccessProof as jest.Mock).mockReturnValue('proof.sig');
});

const KEY = 'chk_0123456789abcdef';

function known(id: string): CommerceProduct {
  return {
    source: 'shop',
    id,
    title: id,
    tagline: null,
    description: null,
    category: null,
    priceDsi: 10,
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

describe('getCommerceApi', () => {
  it('une interface par source', () => {
    expect(getCommerceApi('shop').source).toBe('shop');
    expect(getCommerceApi('marketplace').source).toBe('marketplace');
  });

  it('Boutique : favoris = catalogue connu, puis détail des manquants, 404 masqué', async () => {
    mockGet.mockImplementation((path: string) => {
      if (path === '/api/shop/catalog/prod_abc123') {
        return res(200, shopProduct);
      }
      return res(404, shopE404);
    });
    const r = await getCommerceApi('shop').fetchProductsByIds({
      ids: ['prod_known', 'prod_abc123', 'prod_gone'],
      known: [known('prod_known')],
    });
    expect(r.kind).toBe('success');
    if (r.kind !== 'success') {
      return;
    }
    expect(r.items.map(p => p.id)).toEqual(['prod_known', 'prod_abc123']);
    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  it('Boutique : une erreur autre que 404 est rendue telle quelle', async () => {
    mockGet.mockReturnValue(
      res(503, {success: false, error: 'x', code: 'UNAVAILABLE', data: null}),
    );
    const r = await getCommerceApi('shop').fetchProductsByIds({
      ids: ['prod_a'],
    });
    expect(r.kind === 'failure' && r.errorKind).toBe('unavailable');
  });

  it('Marketplace : ids par lots de 100, ordre conservé', async () => {
    mockGet.mockReturnValue(res(200, mpCatalog));
    const ids = Array.from({length: 150}, (_, i) => `lst_${i}`);
    const r = await getCommerceApi('marketplace').fetchProductsByIds({ids});
    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(r.kind).toBe('success');
    if (r.kind === 'success') {
      expect(r.items).toHaveLength(4);
    }
  });

  it('achat : chaque source appelle son Worker', async () => {
    mockPost.mockReturnValue(res(200, shopCheckoutPaid));
    const s = await getCommerceApi('shop').purchase({
      productId: 'prod_abc123',
      idempotencyKey: KEY,
    });
    expect(s.kind === 'success' && s.order.status).toBe('paid');
    expect(mockPost.mock.calls[0][0]).toBe('/api/shop/checkout');

    mockPost.mockReset();
    mockPost.mockReturnValue(res(200, mpPaid));
    const m = await getCommerceApi('marketplace').purchase({
      productId: 'lst_a1b2c3d4e5f6',
      idempotencyKey: KEY,
    });
    expect(m.kind === 'success' && m.order.orderId).toBe('mp_001');
    expect(mockPost.mock.calls[0][0]).toBe('/api/marketplace/orders');
  });

  it('vérification : Boutique relit la commande, Marketplace réconcilie', async () => {
    mockGet.mockReturnValue(res(200, shopOrderFailed));
    const s = await getCommerceApi('shop').verifyOrder('shop_003');
    expect(s.kind === 'success' && s.order.status).toBe('failed');
    expect(mockGet.mock.calls[0][0]).toBe('/api/shop/orders/shop_003');

    mockPost.mockReturnValue(res(200, mpReconcile));
    const m = await getCommerceApi('marketplace').verifyOrder('mp_002');
    expect(m.kind === 'success' && m.order.status).toBe('paid');
    expect(mockPost.mock.calls[0][0]).toBe(
      '/api/marketplace/me/orders/mp_002/reconcile',
    );
  });

  it('accès : Marketplace = lien du vendeur dans l’app', async () => {
    mockGet.mockReturnValue(res(200, mpDelivery));
    const r = await getCommerceApi('marketplace').access({orderId: 'mp_001', productId: null});
    expect(r.kind === 'success' && r.mode).toBe('webview');
    expect(r.kind === 'success' && r.url).toBe('https://vendeur.example.invalid/acces/abc');
  });

  it('accès : Boutique = bibliothèque puis URL temporaire, hors de l’app', async () => {
    mockGet.mockReturnValue(res(200, shopLibrary));
    mockPost.mockReturnValue(res(200, shopReadUrl));
    const r = await getCommerceApi('shop').access({orderId: 'shop_001', productId: 'prod_abc123'});
    expect(r.kind === 'success' && r.mode).toBe('external');
    expect(mockPost.mock.calls[0][0]).toBe('/api/shop/media/file_asset_1/read-url');
  });

  it('accès : Boutique sans fichier acquis = indisponible, sans appel de lecture', async () => {
    mockGet.mockReturnValue(res(200, shopLibrary));
    const r = await getCommerceApi('shop').access({orderId: 'shop_001', productId: 'prod_autre'});
    expect(r.kind === 'failure' && r.errorKind).toBe('entitlementUnavailable');
    expect(mockPost).not.toHaveBeenCalled();
  });
});
