import covers from '../contracts/content/covers.json';
import type {Content} from '@core/utils/contentDisplay';
import {fetchCovers} from '@core/api/endpoints/content/covers.api';
import {
  coversFromContents,
  mapCovers,
} from '../src/core/api/endpoints/content/covers.mapper';
import {createCoversStore} from '../src/features/content/store/coversStore';

jest.mock('@core/api/endpoints/content/covers.api');

const mCovers = fetchCovers as jest.Mock;

const content = (id: number, thumb: string | null, isPart: boolean | null = null): Content =>
  ({id, slug: `s${id}`, title: `T${id}`, thumbnailUrl: thumb, isPart} as Content);

beforeEach(() => jest.resetAllMocks());

describe('mapCovers', () => {
  it('contrat : petite variante préférée, sinon miniature', () => {
    const r = mapCovers(200, covers);
    if (r.kind !== 'success') {
      throw new Error('attendu : succès');
    }
    expect(r.items.map(i => i.imageUrl)).toEqual([
      'https://covers.example.invalid/book/12-9f3a1c-240.webp',
      'https://covers.example.invalid/book/15-b21e77.webp',
    ]);
  });
  it('écarte sans image https, sans id et les doublons', () => {
    const r = mapCovers(200, {items: [
      {id: 1, slug: 'a', title: 'A', thumbnail_url: 'http://x.invalid/a.jpg'},
      {id: 2, slug: 'b', title: 'B', thumbnail_url: null},
      {slug: 'c', title: 'C', thumbnail_url: 'https://x.invalid/c.jpg'},
      {id: 4, slug: 'd', title: 'D', thumbnail_url: 'https://x.invalid/d.jpg'},
      {id: 4, slug: 'd', title: 'D', thumbnail_url: 'https://x.invalid/d.jpg'},
    ]});
    if (r.kind !== 'success') {
      throw new Error('attendu : succès');
    }
    expect(r.items.map(i => i.id)).toEqual([4]);
  });
  it('liste vide : succès ; 404 et 422 : échecs avec leur code', () => {
    expect(mapCovers(200, {items: []})).toEqual({kind: 'success', items: []});
    expect(mapCovers(404, {error: 'NOT_FOUND'})).toMatchObject({kind: 'failure', errorKind: 'notFound'});
    expect(mapCovers(422, {error: 'INVALID_TYPE'})).toMatchObject({kind: 'failure', code: 'INVALID_TYPE'});
  });
});

describe('repli depuis le catalogue', () => {
  it('garde les contenus avec image, sans les parties, jusqu\'à la limite', () => {
    const out = coversFromContents([
      content(1, 'https://x.invalid/1.jpg'),
      content(2, null),
      content(3, 'https://x.invalid/3.jpg', true),
      content(4, 'https://x.invalid/4.jpg'),
      content(5, 'https://x.invalid/5.jpg'),
    ], 2);
    expect(out.map(c => c.id)).toEqual([1, 4]);
  });
});

describe('coversStore', () => {
  it('charge les couvertures de la maison', async () => {
    mCovers.mockResolvedValue({kind: 'success', items: [{id: 1, slug: 'a', title: 'A', imageUrl: 'https://x.invalid/a.jpg'}]});
    const s = createCoversStore('book');
    await s.load();
    expect(mCovers).toHaveBeenCalledWith({type: 'book', limit: 16});
    expect(s.getState().data).toHaveLength(1);
  });
  it('échec : erreur du store', async () => {
    mCovers.mockResolvedValue({kind: 'failure', errorKind: 'network', status: null, code: null});
    const s = createCoversStore('video');
    await s.load();
    expect(s.getState().status).toBe('error');
  });
});
