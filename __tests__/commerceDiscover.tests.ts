import {
  chunk,
  featuredOf,
  newestOf,
  RAIL_MAX,
  trendingOf,
} from '../src/features/commerce/logic/discover';
import type {CommerceProduct} from '../src/features/commerce/store/commerceTypes';

function p(id: string, o: Partial<CommerceProduct> = {}): CommerceProduct {
  return {id, reviewAvg: null, reviewCount: 0, createdAt: null, ...o} as CommerceProduct;
}

describe('newestOf', () => {
  it('plus récents d\'abord, sans date en dernier, limité à RAIL_MAX', () => {
    const items = [p('a', {createdAt: 1}), p('b'), p('c', {createdAt: 3})];
    expect(newestOf(items).map(x => x.id)).toEqual(['c', 'a', 'b']);
    const many = Array.from({length: 25}, (_, i) => p(String(i), {createdAt: i}));
    expect(newestOf(many)).toHaveLength(RAIL_MAX);
  });
  it('ne modifie pas la liste d\'entrée', () => {
    const items = [p('a', {createdAt: 1}), p('b', {createdAt: 2})];
    newestOf(items);
    expect(items.map(x => x.id)).toEqual(['a', 'b']);
  });
});

describe('trendingOf', () => {
  const catalogue = [
    p('a', {reviewCount: 1, reviewAvg: 5}),
    p('b', {reviewCount: 4, reviewAvg: 3}),
    p('c', {reviewCount: 4, reviewAvg: 4.5}),
    p('d', {createdAt: 9}),
  ];
  it('liste du serveur gardée telle quelle', () => {
    const server = [p('z'), p('y')];
    expect(trendingOf(server, catalogue).map(x => x.id)).toEqual(['z', 'y']);
  });
  it('sans liste serveur : avis, puis note, puis nouveauté', () => {
    expect(trendingOf([], catalogue).map(x => x.id)).toEqual(['c', 'b', 'a', 'd']);
  });
  it('respecte la limite', () => {
    expect(trendingOf([], catalogue, 2)).toHaveLength(2);
  });
});

describe('featuredOf', () => {
  it('premier des tendances, sinon du catalogue, sinon rien', () => {
    expect(featuredOf([p('t')], [p('c')])?.id).toBe('t');
    expect(featuredOf([], [p('c')])?.id).toBe('c');
    expect(featuredOf([], [])).toBeNull();
  });
});

describe('chunk', () => {
  it('rangées de deux, la dernière peut être plus courte', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 2)).toEqual([]);
  });
});
