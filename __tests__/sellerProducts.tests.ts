jest.mock('@core/api/endpoints/marketplace/seller/seller.api', () => ({
  archiveSellerListing: jest.fn(),
  createSellerListing: jest.fn(),
  duplicateSellerListing: jest.fn(),
  fetchSellerCategories: jest.fn(),
  fetchSellerListing: jest.fn(),
  fetchSellerListings: jest.fn(),
  submitSellerListing: jest.fn(),
  unpublishSellerListing: jest.fn(),
  updateSellerListing: jest.fn(),
}));
jest.mock('@shared/store', () => ({storeRegistry: {register: () => undefined}}));

import {
  createSellerListing,
  fetchSellerListings,
  submitSellerListing,
} from '@core/api/endpoints/marketplace/seller/seller.api';
import {
  EMPTY_DRAFT,
  actionsFor,
  draftErrors,
  draftToInput,
  fcfaToDsi,
  parsePriceFcfa,
  productErrorKey,
} from '../src/features/commerce/seller/logic/sellerProductForm';
import {
  sellerProducts,
  sellerProductsStore,
} from '../src/features/commerce/seller/store/sellerProductsStore';
import {dsiToFcfa} from '../src/core/utils/dsi';
import commerceFr from '../src/shared/i18n/locales/commerce.fr.json';
import commerceEn from '../src/shared/i18n/locales/commerce.en.json';

const list = fetchSellerListings as jest.Mock;
const submit = submitSellerListing as jest.Mock;
const create = createSellerListing as jest.Mock;

const counts = {all: 1, published: 1, draft: 0, pending_review: 0, rejected: 0, suspended: 0, archived: 0};
const item = (id: string) => ({
  id,
  title: `Produit ${id}`,
  category: 'general',
  categoryLabel: 'Général',
  priceDsi: 1000,
  free: false,
  status: 'published',
  visibility: 'PUBLIC',
  coverUrl: null,
  salesCount: 0,
  revenueDsi: 0,
  viewsCount: 0,
  rejectionReason: null,
  createdAt: null,
  updatedAt: null,
});

beforeEach(() => {
  jest.clearAllMocks();
  sellerProducts.reset();
});

describe('produits vendeur : prix', () => {
  it('FCFA → DSI → FCFA est exact', () => {
    for (const f of [0, 1, 7, 100, 1000, 12345]) {
      expect(dsiToFcfa(fcfaToDsi(f))).toBe(f);
    }
    expect(fcfaToDsi(400)).toBe(1000);
  });
  it('saisie du prix', () => {
    expect(parsePriceFcfa('')).toBe(0);
    expect(parsePriceFcfa('1 500')).toBe(1500);
    expect(parsePriceFcfa('12,5')).toBeNull();
    expect(parsePriceFcfa('-3')).toBeNull();
  });
});

describe('produits vendeur : formulaire', () => {
  const ok = {
    ...EMPTY_DRAFT,
    title: ' Guide ',
    deliveryUrl: 'https://drive.google.com/x',
    priceText: '400',
    description: 'Texte',
    category: 'tools',
  };
  it('valide étape par étape', () => {
    expect(draftErrors(EMPTY_DRAFT, 1)).toEqual(['title', 'deliveryUrl']);
    expect(draftErrors({...ok, deliveryUrl: 'http://x.com'}, 1)).toEqual(['deliveryUrl']);
    expect(draftErrors(ok, 1)).toEqual([]);
    expect(draftErrors(EMPTY_DRAFT, 2)).toEqual(['description']);
    expect(draftErrors(EMPTY_DRAFT, 3)).toEqual(['category']);
  });
  it('corps de création : prix en DSI, statut de lancement, jamais published', () => {
    expect(draftToInput(ok, true)).toEqual({
      title: 'Guide',
      description: 'Texte',
      category: 'tools',
      priceDsi: 1000,
      deliveryUrl: 'https://drive.google.com/x',
      status: 'pending_review',
    });
    expect(draftToInput({...ok, launch: 'draft'}, true).status).toBe('draft');
    expect(draftToInput(ok, false)).not.toHaveProperty('status');
  });
  it('actions selon le statut', () => {
    expect(actionsFor('draft')).toContain('submit');
    expect(actionsFor('published')).toContain('unpublish');
    expect(actionsFor('published')).not.toContain('submit');
    expect(actionsFor('archived')).toEqual([]);
  });
  it('erreurs : aucun texte du Worker', () => {
    expect(productErrorKey('conflict')).toBe('commerce.sellerSpace.products.errors.conflict');
    expect(productErrorKey('network')).toBe('app.catalogue.errorNetwork');
    expect(productErrorKey('whatever')).toBe('app.catalogue.errorGeneric');
  });
});

describe('produits vendeur : store', () => {
  it('charge la première page puis la suivante sans doublon', async () => {
    list
      .mockResolvedValueOnce({kind: 'success', page: {counts, items: [item('a')], nextCursor: 'c1'}})
      .mockResolvedValueOnce({kind: 'success', page: {counts, items: [item('a'), item('b')], nextCursor: null}});
    await sellerProducts.load();
    expect(sellerProductsStore.getState().items.map(i => i.id)).toEqual(['a']);
    await sellerProducts.loadMore();
    expect(sellerProductsStore.getState().items.map(i => i.id)).toEqual(['a', 'b']);
    expect(list).toHaveBeenLastCalledWith({status: 'all', q: '', cursor: 'c1'});
  });
  it('échec : état erreur sans texte du Worker', async () => {
    list.mockResolvedValueOnce({kind: 'failure', errorKind: 'network', status: 0, code: null});
    await sellerProducts.load();
    expect(sellerProductsStore.getState()).toMatchObject({status: 'error', error: 'network'});
  });
  it('action refusée (409) : conserve la liste et expose la nature', async () => {
    list.mockResolvedValue({kind: 'success', page: {counts, items: [item('a')], nextCursor: null}});
    await sellerProducts.load();
    submit.mockResolvedValueOnce({kind: 'failure', errorKind: 'conflict', status: 409, code: 'CONFLICT'});
    expect(await sellerProducts.act('a', 'submit')).toBe(false);
    expect(sellerProductsStore.getState()).toMatchObject({actionError: 'conflict', busyId: null});
    expect(sellerProductsStore.getState().items).toHaveLength(1);
  });
  it('création réussie : la liste est relue', async () => {
    create.mockResolvedValueOnce({kind: 'success', listing: item('n')});
    list.mockResolvedValue({kind: 'success', page: {counts, items: [item('n')], nextCursor: null}});
    expect(await sellerProducts.save({title: 'x'}, null)).toEqual({ok: true});
    expect(list).toHaveBeenCalledTimes(1);
  });
  it('purge : une réponse tardive est ignorée', async () => {
    let resolve: (v: unknown) => void = () => undefined;
    list.mockReturnValueOnce(new Promise(r => (resolve = r)));
    const p = sellerProducts.load();
    sellerProducts.reset();
    resolve({kind: 'success', page: {counts, items: [item('z')], nextCursor: null}});
    await p;
    expect(sellerProductsStore.getState().items).toEqual([]);
  });
});

describe('produits vendeur : i18n', () => {
  const keys = (o: unknown, p = ''): string[] =>
    o && typeof o === 'object'
      ? Object.entries(o).flatMap(([k, v]) => keys(v, `${p}${k}.`))
      : [p];
  it('parité fr / en', () => {
    const fr = commerceFr.commerce.sellerSpace.products;
    const en = commerceEn.commerce.sellerSpace.products;
    expect(keys(en).sort()).toEqual(keys(fr).sort());
  });
});
