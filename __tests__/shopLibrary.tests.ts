import {shopLibraryStore} from '../src/features/commerce/store/libraryStore';
import {libraryOpenErrorKey} from '../src/features/commerce/logic/errorKey';

jest.mock('@shared/store', () => ({storeRegistry: {register: jest.fn()}}));
jest.mock('@core/api/endpoints/shop/shop.api', () => ({
  fetchShopLibrary: jest.fn(),
  fetchShopReadUrl: jest.fn(),
}));

const shopApi = jest.requireMock('@core/api/endpoints/shop/shop.api') as Record<
  string,
  jest.Mock
>;

const item = (productId: string, extra: Record<string, unknown> = {}) => ({
  productId,
  title: productId,
  category: null,
  assetFileId: `file_${productId}`,
  hasAsset: true,
  grantedAt: 1,
  orderId: 'shop_1',
  ...extra,
});

const failure = (errorKind: string) => ({
  kind: 'failure',
  errorKind,
  status: 403,
  code: null,
});

beforeEach(() => {
  Object.values(shopApi).forEach(m => m.mockReset());
  shopLibraryStore.reset();
});

describe('Bibliothèque Boutique : store', () => {
  it('charge les achats, les plus récents d’abord', async () => {
    shopApi.fetchShopLibrary.mockResolvedValue({
      kind: 'success',
      items: [item('old', {grantedAt: 1}), item('new', {grantedAt: 9})],
    });
    await shopLibraryStore.load();
    const s = shopLibraryStore.getState();
    expect(s.status).toBe('success');
    expect(s.items.map(i => i.productId)).toEqual(['new', 'old']);
  });
  it('échec de chargement : état erreur', async () => {
    shopApi.fetchShopLibrary.mockResolvedValue(failure('network'));
    await shopLibraryStore.load();
    expect(shopLibraryStore.getState().status).toBe('error');
    expect(shopLibraryStore.getState().errorKind).toBe('network');
  });
  it('ouverture : l’assetFileId acquis est utilisé tel quel', async () => {
    shopApi.fetchShopLibrary.mockResolvedValue({
      kind: 'success',
      items: [item('a')],
    });
    await shopLibraryStore.load();
    shopApi.fetchShopReadUrl.mockResolvedValue({
      kind: 'success',
      url: 'https://files.example/a?sig=1',
    });
    const r = await shopLibraryStore.open('a');
    expect(r).toEqual({ok: true, url: 'https://files.example/a?sig=1'});
    expect(shopApi.fetchShopReadUrl).toHaveBeenCalledWith('file_a');
    expect(shopLibraryStore.getState().openingId).toBeNull();
  });
  it('sans fichier déterminé : aucun appel, échec « indisponible »', async () => {
    shopApi.fetchShopLibrary.mockResolvedValue({
      kind: 'success',
      items: [
        item('none', {hasAsset: false}),
        item('noid', {assetFileId: null}),
      ],
    });
    await shopLibraryStore.load();
    for (const id of ['none', 'noid', 'absent']) {
      const r = await shopLibraryStore.open(id);
      expect(r).toEqual({ok: false, errorKind: 'entitlementUnavailable'});
    }
    expect(shopApi.fetchShopReadUrl).not.toHaveBeenCalled();
  });
  it('échec d’ouverture : nature rendue, ouverture libérée', async () => {
    shopApi.fetchShopLibrary.mockResolvedValue({
      kind: 'success',
      items: [item('a')],
    });
    await shopLibraryStore.load();
    shopApi.fetchShopReadUrl.mockResolvedValue(failure('forbidden'));
    const r = await shopLibraryStore.open('a');
    expect(r).toEqual({ok: false, errorKind: 'forbidden'});
    expect(shopLibraryStore.getState().openingId).toBeNull();
  });
  it('une seule ouverture à la fois', async () => {
    shopApi.fetchShopLibrary.mockResolvedValue({
      kind: 'success',
      items: [item('a'), item('b')],
    });
    await shopLibraryStore.load();
    let release: (v: unknown) => void = () => undefined;
    shopApi.fetchShopReadUrl.mockReturnValue(new Promise(r => (release = r)));
    const first = shopLibraryStore.open('a');
    const second = await shopLibraryStore.open('b');
    expect(second).toEqual({ok: false, errorKind: 'conflict'});
    expect(shopApi.fetchShopReadUrl).toHaveBeenCalledTimes(1);
    release({kind: 'success', url: 'https://files.example/a'});
    await first;
  });
});

describe('Bibliothèque Boutique : messages', () => {
  it('ressource indisponible : support ; accès refusé ; occupé', () => {
    expect(libraryOpenErrorKey('entitlementUnavailable')).toBe(
      'commerce.library.support',
    );
    expect(libraryOpenErrorKey('forbidden')).toBe('commerce.library.denied');
    expect(libraryOpenErrorKey('conflict')).toBe('commerce.library.busy');
  });
  it('autres échecs : messages d’accès communs', () => {
    expect(libraryOpenErrorKey('network')).toBe(
      'mp.orders.accessErrors.network',
    );
    expect(libraryOpenErrorKey('unauthorized')).toBe(
      'mp.orders.accessErrors.session',
    );
  });
});
