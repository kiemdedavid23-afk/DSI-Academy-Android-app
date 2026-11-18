import {
  fetchCatalogue,
  fetchContentById,
  searchContent,
} from '@core/api/endpoints/content/catalogue.api';
import type {Content} from '@core/utils/contentDisplay';
import {
  createCatalogueStore,
  CATALOGUE_PAGE_SIZE,
} from '../src/features/content/store/catalogueStore';
import {createSearchStore} from '../src/features/content/store/searchStore';
import {createDetailStore} from '../src/features/content/store/detailStore';
import {contentErrorKey} from '../src/features/content/logic/errorKey';
import {continueContentId} from '../src/features/academy/logic/houses';

jest.mock('@core/api/endpoints/content/catalogue.api');

const mCat = fetchCatalogue as jest.Mock;
const mSearch = searchContent as jest.Mock;
const mById = fetchContentById as jest.Mock;

function book(id: number): Content {
  return {
    id,
    uid: null,
    type: 'book',
    slug: `b-${id}`,
    title: `Livre ${id}`,
    description: null,
    language: 'fr',
    categoryId: null,
    editorialStatus: 'published',
    moderationStatus: 'active',
    metadata: {},
    level: null,
    durationSeconds: null,
    viewCount: 0,
    likeCount: 0,
    partsCount: 0,
    isPart: null,
    thumbnailUrl: null,
    createdAt: null,
    updatedAt: null,
  };
}
const fail = {kind: 'failure', errorKind: 'network', status: null, code: null};

beforeEach(() => jest.resetAllMocks());

describe('catalogueStore', () => {
  it('charge la première page avec la taille choisie, type book', async () => {
    mCat.mockResolvedValue({kind: 'success', items: [book(2), book(1)], nextCursor: null, hiddenCount: 0});
    const s = createCatalogueStore('book');
    await s.load();
    expect(mCat).toHaveBeenCalledWith({type: 'book', categoryId: undefined, limit: CATALOGUE_PAGE_SIZE});
    expect(s.getState().status).toBe('success');
    expect(s.getState().items.map(i => i.id)).toEqual([2, 1]);
  });

  it('ajoute la suite avec le curseur complet, sans doublon', async () => {
    const cursor = {createdAt: 1793527200, id: 1};
    mCat
      .mockResolvedValueOnce({kind: 'success', items: [book(2), book(1)], nextCursor: cursor, hiddenCount: 0})
      .mockResolvedValueOnce({kind: 'success', items: [book(1), book(0)], nextCursor: null, hiddenCount: 0});
    const s = createCatalogueStore('book');
    await s.load();
    await s.loadMore();
    expect(mCat.mock.calls[1][0].cursor).toEqual(cursor);
    expect(s.getState().items.map(i => i.id)).toEqual([2, 1, 0]);
    expect(s.getState().nextCursor).toBeNull();
    await s.loadMore(); // plus de curseur : aucun appel
    expect(mCat).toHaveBeenCalledTimes(2);
  });

  it('changer de catégorie recharge depuis le début', async () => {
    mCat.mockResolvedValue({kind: 'success', items: [book(5)], nextCursor: null, hiddenCount: 0});
    const s = createCatalogueStore('book');
    await s.load();
    await s.setCategory(7);
    expect(mCat.mock.calls[1][0].categoryId).toBe(7);
    expect(s.getState().items.map(i => i.id)).toEqual([5]);
  });

  it('erreur : état error ; échec de la suite : liste conservée', async () => {
    mCat.mockResolvedValueOnce(fail);
    const s = createCatalogueStore('book');
    await s.load();
    expect(s.getState().status).toBe('error');
    expect(s.getState().errorKind).toBe('network');

    mCat
      .mockResolvedValueOnce({kind: 'success', items: [book(1)], nextCursor: {createdAt: 1, id: 1}, hiddenCount: 0})
      .mockResolvedValueOnce(fail);
    await s.load({force: true});
    await s.loadMore();
    expect(s.getState().items).toHaveLength(1);
    expect(s.getState().loadingMore).toBe(false);
  });

  it('ignore une réponse arrivée après un reset', async () => {
    let resolve!: (v: unknown) => void;
    mCat.mockReturnValue(new Promise(r => (resolve = r)));
    const s = createCatalogueStore('book');
    const p = s.load();
    s.reset();
    resolve({kind: 'success', items: [book(1)], nextCursor: null, hiddenCount: 0});
    await p;
    expect(s.getState().items).toEqual([]);
    expect(s.getState().status).toBe('idle');
  });
});

describe('searchStore', () => {
  it('requête vide : aucun appel réseau', async () => {
    const s = createSearchStore('book');
    await s.setQuery('   ');
    expect(mSearch).not.toHaveBeenCalled();
    expect(s.getState().status).toBe('idle');
  });

  it('cherche, puis pagine par offset', async () => {
    const page = (ids: number[], offset: number) => ({kind: 'success', query: 'x', items: ids.map(book), limit: 2, offset});
    mSearch.mockResolvedValueOnce(page([1, 2], 0)).mockResolvedValueOnce(page([3], 2));
    const s = createSearchStore('book');
    await s.setQuery(' gestion ');
    expect(mSearch.mock.calls[0][0]).toMatchObject({query: 'gestion', type: 'book', offset: 0});
    expect(s.getState().hasMore).toBe(true);
    await s.loadMore();
    expect(mSearch.mock.calls[1][0].offset).toBe(2);
    expect(s.getState().items.map(i => i.id)).toEqual([1, 2, 3]);
    expect(s.getState().hasMore).toBe(false);
  });

  it('une ancienne recherche ne remplace pas la nouvelle', async () => {
    let resolveOld!: (v: unknown) => void;
    mSearch
      .mockReturnValueOnce(new Promise(r => (resolveOld = r)))
      .mockResolvedValueOnce({kind: 'success', query: 'b', items: [book(9)], limit: 20, offset: 0});
    const s = createSearchStore('book');
    const old = s.setQuery('a');
    await s.setQuery('b');
    resolveOld({kind: 'success', query: 'a', items: [book(1)], limit: 20, offset: 0});
    await old;
    expect(s.getState().items.map(i => i.id)).toEqual([9]);
  });
});

describe('detailStore', () => {
  it('charge, met en cache, puis sert depuis le cache', async () => {
    mById.mockResolvedValue({kind: 'success', item: book(12)});
    const s = createDetailStore();
    await s.load(12);
    expect(s.getState().item?.id).toBe(12);
    await s.load(12);
    expect(mById).toHaveBeenCalledTimes(1);
    await s.load(12, {force: true});
    expect(mById).toHaveBeenCalledTimes(2);
  });

  it('une fiche déjà vue en liste (seed) s\'affiche sans appel', async () => {
    const s = createDetailStore();
    s.seed(book(4));
    await s.load(4);
    expect(mById).not.toHaveBeenCalled();
    expect(s.getState().status).toBe('success');
  });

  it('contenu non publié : erreur typée', async () => {
    mById.mockResolvedValue({kind: 'failure', errorKind: 'notFound', status: 404, code: 'CONTENT_NOT_FOUND'});
    const s = createDetailStore();
    await s.load(3);
    expect(s.getState().status).toBe('error');
    expect(contentErrorKey(s.getState().errorKind)).toBe('content.notFound');
  });
});

describe('logique hub', () => {
  it('reprise : seulement un contenu à id numérique (Bibliothèque, Audio, Vidéos)', () => {
    expect(continueContentId({id: '12', house: 'library'})).toBe(12);
    expect(continueContentId({id: 'abc', house: 'library'})).toBeNull();
    expect(continueContentId({id: '12', house: 'community'})).toBeNull();
    expect(continueContentId(null)).toBeNull();
  });
  it('clés d\'erreur', () => {
    expect(contentErrorKey('network')).toBe('app.catalogue.errorNetwork');
    expect(contentErrorKey('server')).toBe('app.catalogue.errorServer');
    expect(contentErrorKey('forbidden')).toBe('content.contentNotAvailable');
    expect(contentErrorKey(null)).toBe('app.catalogue.errorGeneric');
  });
});
