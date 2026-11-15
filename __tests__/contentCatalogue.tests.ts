/* eslint-disable prettier/prettier */
import {http} from '@core/network';
import {NetworkError} from '@core/network/errors';
import {
  fetchCatalogue,
  fetchCategories,
  fetchContentById,
  fetchContentBySlug,
  searchContent,
} from '@core/api/endpoints/content/catalogue.api';
import {
  mapCatalogue,
  mapCategories,
  mapContentDetail,
  mapSearch,
} from '@core/api/endpoints/content/catalogue.mapper';
import {
  isPubliclyVisible,
  mapContent,
  parseWorkerErrorCode,
} from '@core/api/endpoints/content/common.mapper';
import {isHttpsUrl} from '@core/config/urlGuards';
import page from '../contracts/content/catalogue.page.json';
import empty from '../contracts/content/catalogue.empty.json';
import detail from '../contracts/content/content.detail.json';
import draft from '../contracts/content/content.draft.json';
import moderated from '../contracts/content/content.moderated.json';
import categories from '../contracts/content/categories.json';
import search from '../contracts/content/search.json';
import e404 from '../contracts/content/error.404.contentNotFound.json';
import e422 from '../contracts/content/error.422.missingQuery.json';

jest.mock('@core/network', () => ({http: {service: jest.fn()}}));
const mockGet = jest.fn();
beforeEach(() => {
  mockGet.mockReset();
  (http.service as jest.Mock).mockReturnValue({get: mockGet});
});

describe('common.mapper', () => {
  it('code d’erreur = partie avant « — »', () => {
    expect(parseWorkerErrorCode(e404)).toBe('CONTENT_NOT_FOUND');
    expect(parseWorkerErrorCode({error: 'INTERNAL_ERROR'})).toBe(
      'INTERNAL_ERROR',
    );
    expect(parseWorkerErrorCode({error: 'texte libre'})).toBeNull();
    expect(parseWorkerErrorCode(null)).toBeNull();
  });
  it('mapContent : champs vitaux requis, vignette https seulement', () => {
    expect(mapContent({id: 1})).toBeNull();
    expect(mapContent({...detail, type: 'ebook'})).toBeNull();
    expect(mapContent({...detail, thumbnail_url: 'http://x.invalid/a.png'})!.thumbnailUrl).toBeNull();
    const c = mapContent(page.items[0])!;
    expect(c.thumbnailUrl).toBe('https://img.example.invalid/12.webp');
    expect(c.categoryId).toBe(3);
  });
  it('visibilité : published + active uniquement', () => {
    expect(isPubliclyVisible(mapContent(detail)!)).toBe(true);
    expect(isPubliclyVisible(mapContent(draft)!)).toBe(false);
    expect(isPubliclyVisible(mapContent(moderated)!)).toBe(false);
  });
  it('isHttpsUrl', () => {
    expect(isHttpsUrl('https://a.invalid/x')).toBe(true);
    expect(isHttpsUrl('http://a.invalid/x')).toBe(false);
    expect(isHttpsUrl('javascript:alert(1)')).toBe(false);
    expect(isHttpsUrl('https:// a')).toBe(false);
    expect(isHttpsUrl(42)).toBe(false);
  });
});

describe('catalogue.mapper', () => {
  it('page : écarte les brouillons, garde le curseur', () => {
    const r = mapCatalogue(200, page);
    expect(r.kind).toBe('success');
    if (r.kind === 'success') {
      expect(r.items.map(i => i.id)).toEqual([12, 11]);
      expect(r.hiddenCount).toBe(1);
      expect(r.nextCursor).toEqual({createdAt: '2026-11-01T10:00:00Z', id: 10});
    }
  });
  it('vide : succès, pas une erreur', () => {
    const r = mapCatalogue(200, empty);
    expect(r).toMatchObject({kind: 'success', items: [], nextCursor: null});
  });
  it('curseur incomplet → null', () => {
    const r = mapCatalogue(200, {items: [], next_cursor: {cursor_id: 3}});
    expect(r).toMatchObject({kind: 'success', nextCursor: null});
  });
  it('corps invalide / sans items → invalidResponse', () => {
    expect(mapCatalogue(200, null, 'invalid')).toMatchObject({errorKind: 'invalidResponse'});
    expect(mapCatalogue(200, {})).toMatchObject({errorKind: 'invalidResponse'});
  });
  it('500 → server', () => {
    expect(mapCatalogue(500, {error: 'INTERNAL_ERROR'})).toMatchObject({
      errorKind: 'server',
      code: 'INTERNAL_ERROR',
    });
  });
  it('détail : visible → succès ; brouillon et modéré → notFound local', () => {
    expect(mapContentDetail(200, detail).kind).toBe('success');
    expect(mapContentDetail(200, draft)).toMatchObject({errorKind: 'notFound', code: 'CONTENT_NOT_VISIBLE'});
    expect(mapContentDetail(200, moderated)).toMatchObject({errorKind: 'notFound'});
    expect(mapContentDetail(404, e404)).toMatchObject({errorKind: 'notFound', code: 'CONTENT_NOT_FOUND'});
  });
  it('recherche et catégories', () => {
    const s = mapSearch(200, search);
    expect(s).toMatchObject({kind: 'success', query: 'finance', limit: 20, offset: 0});
    expect(mapSearch(422, e422)).toMatchObject({errorKind: 'validation', code: 'MISSING_QUERY'});
    const c = mapCategories(200, categories);
    expect(c.kind === 'success' && c.items.map(i => i.slug)).toEqual(['finance', 'mindset']);
  });
});

describe('catalogue.api', () => {
  it('fetchCatalogue : route publique, published demandé, curseur complet', async () => {
    mockGet.mockResolvedValue({status: 200, ok: true, body: page, bodyKind: 'json'});
    const r = await fetchCatalogue({
      type: 'book',
      categoryId: 3,
      limit: 30,
      cursor: {createdAt: '2026-11-01T10:00:00Z', id: 10},
    });
    expect(http.service).toHaveBeenCalledWith('content');
    expect(mockGet).toHaveBeenCalledWith('/content', {
      auth: 'none',
      query: {
        type: 'book',
        editorial_status: 'published',
        category_id: 3,
        language: undefined,
        limit: 30,
        cursor_created_at: '2026-11-01T10:00:00Z',
        cursor_id: 10,
      },
    });
    expect(r.kind).toBe('success');
  });
  it('fetchContentById / BySlug : chemins et id invalide sans réseau', async () => {
    mockGet.mockResolvedValue({status: 200, ok: true, body: detail, bodyKind: 'json'});
    await fetchContentById(12);
    expect(mockGet).toHaveBeenLastCalledWith('/content/12', {auth: 'none'});
    await fetchContentBySlug('book', 'mon livre');
    expect(mockGet).toHaveBeenLastCalledWith('/content/by-slug/book/mon%20livre', {auth: 'none'});
    mockGet.mockClear();
    expect(await fetchContentById(0)).toMatchObject({errorKind: 'validation'});
    expect(await fetchContentBySlug('book', '')).toMatchObject({errorKind: 'validation'});
    expect(mockGet).not.toHaveBeenCalled();
  });
  it('searchContent : q vide sans réseau, sinon /search', async () => {
    expect(await searchContent({query: '  '})).toMatchObject({code: 'MISSING_QUERY'});
    expect(mockGet).not.toHaveBeenCalled();
    mockGet.mockResolvedValue({status: 200, ok: true, body: search, bodyKind: 'json'});
    await searchContent({query: ' finance ', type: 'book', limit: 20, offset: 0});
    expect(mockGet).toHaveBeenCalledWith('/search', {
      auth: 'none',
      query: {q: 'finance', type: 'book', language: undefined, category_id: undefined, limit: 20, offset: 0},
    });
  });
  it('fetchCategories et erreur réseau', async () => {
    mockGet.mockResolvedValue({status: 200, ok: true, body: categories, bodyKind: 'json'});
    await fetchCategories('video');
    expect(mockGet).toHaveBeenCalledWith('/content/categories', {auth: 'none', query: {type: 'video'}});
    mockGet.mockRejectedValue(new NetworkError());
    expect(await fetchCategories('video')).toMatchObject({errorKind: 'network'});
    mockGet.mockRejectedValue(new Error('x'));
    expect(await fetchCategories('video')).toMatchObject({errorKind: 'server'});
  });
});
