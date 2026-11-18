import {COMMERCE_STORES} from '../src/features/commerce/store/commerceStores';
import {
  categoryKeys,
  commerceErrorKey,
} from '../src/features/commerce/logic/errorKey';
import {formatDsiAmount} from '../src/features/commerce/logic/format';
import type {CommerceProduct} from '../src/features/commerce/store/commerceTypes';

jest.mock('@shared/store', () => ({storeRegistry: {register: jest.fn()}}));
jest.mock('@core/api/endpoints/commerce/commerce.sources', () => {
  const api = {
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
const shop = COMMERCE_STORES.shop;

function product(id: string, extra: Partial<CommerceProduct> = {}): CommerceProduct {
  return {
    source: 'shop',
    id,
    title: id,
    tagline: null,
    description: null,
    category: null,
    priceDsi: 1,
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
    ...extra,
  };
}

const ok = <T extends object>(extra: T) => ({kind: 'success' as const, ...extra});
const fail = (errorKind: string, status = 0) => ({
  kind: 'failure' as const,
  errorKind,
  status,
  code: null,
});

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>(r => {
    resolve = r;
  });
  return {promise, resolve};
}

beforeEach(() => {
  Object.values(api).forEach(fn => fn.mockReset());
  shop.catalogue.reset();
  shop.categories.reset();
  shop.detail.reset();
  shop.favorites.reset();
});

describe('catalogue commun', () => {
  it('charge une fois, sans rappel si la liste est déjà affichée', async () => {
    api.fetchCatalogue.mockResolvedValue(ok({items: [product('a'), product('b')]}));
    await shop.catalogue.load();
    await shop.catalogue.load();
    expect(api.fetchCatalogue).toHaveBeenCalledTimes(1);
    expect(shop.catalogue.getState().items).toHaveLength(2);
  });
  it('catégorie et recherche partent au Worker ; recherche nettoyée', async () => {
    api.fetchCatalogue.mockResolvedValue(ok({items: []}));
    await shop.catalogue.setCategory('tools');
    expect(api.fetchCatalogue).toHaveBeenLastCalledWith({category: 'tools', q: undefined});
    await shop.catalogue.setQuery('  pack ');
    expect(api.fetchCatalogue).toHaveBeenLastCalledWith({category: 'tools', q: 'pack'});
    await shop.catalogue.setQuery('pack');
    expect(api.fetchCatalogue).toHaveBeenCalledTimes(2);
  });
  it('une réponse arrivée après un autre filtre est ignorée', async () => {
    const slow = deferred<ReturnType<typeof ok>>();
    api.fetchCatalogue.mockReturnValueOnce(slow.promise);
    const first = shop.catalogue.setQuery('old');
    api.fetchCatalogue.mockResolvedValueOnce(ok({items: [product('new')]}));
    await shop.catalogue.setQuery('new');
    slow.resolve(ok({items: [product('stale')]}));
    await first;
    expect(shop.catalogue.getState().items.map(p => p.id)).toEqual(['new']);
  });
  it('échec : état erreur avec la nature de l’échec', async () => {
    api.fetchCatalogue.mockResolvedValue(fail('network'));
    await shop.catalogue.load();
    const s = shop.catalogue.getState();
    expect(s.status).toBe('error');
    expect(s.errorKind).toBe('network');
    expect(s.items).toEqual([]);
  });
});

describe('catégories et fiche', () => {
  it('catégories chargées', async () => {
    api.fetchCategories.mockResolvedValue(ok({categories: [{slug: 'x', count: 2}]}));
    await shop.categories.load();
    expect(shop.categories.getState().items[0].slug).toBe('x');
  });
  it('fiche : le produit de la liste s’affiche tout de suite, puis est relu', async () => {
    const slow = deferred<ReturnType<typeof ok>>();
    api.fetchProduct.mockReturnValue(slow.promise);
    const opening = shop.detail.open('a', product('a'));
    expect(shop.detail.getState().product?.id).toBe('a');
    expect(shop.detail.getState().status).toBe('success');
    slow.resolve(ok({product: product('a', {description: 'complet'})}));
    await opening;
    expect(shop.detail.getState().product?.description).toBe('complet');
  });
  it('fiche : un échec garde le produit de la liste', async () => {
    api.fetchProduct.mockResolvedValue(fail('unavailable', 503));
    await shop.detail.open('a', product('a'));
    expect(shop.detail.getState().product?.id).toBe('a');
    expect(shop.detail.getState().status).toBe('success');
  });
  it('fiche : un échec sans produit connu donne l’état erreur', async () => {
    api.fetchProduct.mockResolvedValue(fail('notFound', 404));
    await shop.detail.open('z', null);
    expect(shop.detail.getState().status).toBe('error');
    expect(shop.detail.getState().product).toBeNull();
  });
});

describe('favoris communs', () => {
  it('identifiants puis liste hydratée avec les produits connus', async () => {
    api.fetchFavoriteIds.mockResolvedValue(ok({ids: ['a', 'b']}));
    api.fetchProductsByIds.mockImplementation(
      async ({ids, known}: {ids: string[]; known?: CommerceProduct[]}) =>
        ok({
          items: ids.map(id => known?.find(k => k.id === id) ?? product(id)),
        }),
    );
    await shop.favorites.loadIds();
    expect(shop.favorites.isFavorite('a')).toBe(true);
    await shop.favorites.load([product('a', {title: 'connu'})]);
    expect(shop.favorites.getState().items[0].title).toBe('connu');
    expect(shop.favorites.getState().status).toBe('success');
  });
  it('ajout immédiat, puis annulé si le Worker refuse', async () => {
    api.addFavorite.mockResolvedValueOnce(ok({}));
    expect(await shop.favorites.toggle(product('c'))).toEqual({ok: true, favorite: true});
    expect(shop.favorites.getState().ids).toEqual(['c']);
    api.addFavorite.mockResolvedValueOnce(fail('unauthorized', 401));
    expect(await shop.favorites.toggle(product('d'))).toEqual({
      ok: false,
      errorKind: 'unauthorized',
    });
    expect(shop.favorites.getState().ids).toEqual(['c']);
    expect(shop.favorites.getState().items.some(p => p.id === 'd')).toBe(false);
  });
  it('retrait', async () => {
    api.addFavorite.mockResolvedValue(ok({}));
    api.removeFavorite.mockResolvedValue(ok({}));
    await shop.favorites.toggle(product('c'));
    expect(await shop.favorites.toggle(product('c'))).toEqual({ok: true, favorite: false});
    expect(shop.favorites.isFavorite('c')).toBe(false);
  });
  it('un second appui pendant l’appel est ignoré', async () => {
    const slow = deferred<ReturnType<typeof ok>>();
    api.addFavorite.mockReturnValue(slow.promise);
    const first = shop.favorites.toggle(product('e'));
    const second = await shop.favorites.toggle(product('e'));
    expect(second.ok).toBe(true);
    slow.resolve(ok({}));
    await first;
    expect(shop.favorites.getState().ids.filter(id => id === 'e')).toHaveLength(1);
    expect(api.addFavorite).toHaveBeenCalledTimes(1);
  });
});

describe('logique des écrans', () => {
  it('clés d’erreur', () => {
    expect(commerceErrorKey('network')).toBe('app.catalogue.errorNetwork');
    expect(commerceErrorKey('unauthorized')).toBe('mp.states.errorSession');
    expect(commerceErrorKey('noProof')).toBe('mp.states.errorSession');
    expect(commerceErrorKey('unavailable')).toBe('mp.states.errorBusy');
    expect(commerceErrorKey('notFound')).toBe('commerce.notFound');
    expect(commerceErrorKey(null)).toBe('app.catalogue.errorGeneric');
  });
  it('libellés de catégorie : la source d’abord', () => {
    expect(categoryKeys('shop', 'tools')).toEqual(['shop.cats.tools', 'mp.cats.tools']);
    expect(categoryKeys('marketplace', 'tools')).toEqual([
      'mp.cats.tools',
      'shop.cats.tools',
    ]);
  });
  it('montant DSI groupé par milliers', () => {
    expect(formatDsiAmount(0)).toBe('0');
    expect(formatDsiAmount(999)).toBe('999');
    expect(formatDsiAmount(1500)).toBe('1\u202f500');
    expect(formatDsiAmount(1234567)).toBe('1\u202f234\u202f567');
  });
});
