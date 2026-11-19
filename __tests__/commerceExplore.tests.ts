import {
  DEFAULT_SORT,
  exploreTabsFor,
  SORT_KEYS,
  sortProducts,
} from '../src/features/commerce/logic/explore';
import type {CommerceProduct} from '../src/features/commerce/store/commerceTypes';
import commerceFr from '../src/shared/i18n/locales/commerce.fr.json';
import commerceEn from '../src/shared/i18n/locales/commerce.en.json';

function p(id: string, o: Partial<CommerceProduct> = {}): CommerceProduct {
  return {id, priceDsi: 0, reviewAvg: null, reviewCount: 0, createdAt: null, ...o} as CommerceProduct;
}

const ids = (items: CommerceProduct[]) => items.map(x => x.id);

describe('exploreTabsFor', () => {
  it('Marketplace : Recherche, Catégories, Vendeurs', () => {
    expect(exploreTabsFor('marketplace')).toEqual(['search', 'categories', 'sellers']);
  });
  it('Boutique : pas de Vendeurs', () => {
    expect(exploreTabsFor('shop')).toEqual(['search', 'categories']);
  });
});

describe('sortProducts', () => {
  const items = [
    p('a', {priceDsi: 30, reviewCount: 1, reviewAvg: 5, createdAt: 1}),
    p('b', {priceDsi: 10, reviewCount: 4, reviewAvg: 3, createdAt: 3}),
    p('c', {priceDsi: 20, reviewCount: 4, reviewAvg: 4.5, createdAt: 2}),
    p('d', {priceDsi: 20}),
  ];
  it('popularité par défaut : avis, puis note, puis nouveauté', () => {
    expect(DEFAULT_SORT).toBe('popularity');
    expect(ids(sortProducts(items, 'popularity'))).toEqual(['c', 'b', 'a', 'd']);
  });
  it('nouveautés : les plus récents d\'abord, sans date en dernier', () => {
    expect(ids(sortProducts(items, 'newest'))).toEqual(['b', 'c', 'a', 'd']);
  });
  it('prix croissant et décroissant', () => {
    expect(ids(sortProducts(items, 'priceAsc'))).toEqual(['b', 'c', 'd', 'a']);
    expect(ids(sortProducts(items, 'priceDesc'))).toEqual(['a', 'c', 'd', 'b']);
  });
  it('égalité : l\'ordre d\'origine est gardé, la liste d\'entrée n\'est pas modifiée', () => {
    const copy = ids(items);
    sortProducts(items, 'priceAsc');
    expect(ids(items)).toEqual(copy);
    expect(ids(sortProducts([p('x'), p('y'), p('z')], 'priceAsc'))).toEqual(['x', 'y', 'z']);
  });
});

describe('textes Explorer', () => {
  it.each([
    ['fr', commerceFr],
    ['en', commerceEn],
  ])('%s : un libellé par tri et par sous-section', (_l, json) => {
    const shell = (json as any).commerce.shell;
    for (const k of SORT_KEYS) {
      expect(typeof shell.sort[k]).toBe('string');
    }
    for (const id of ['search', 'categories', 'sellers']) {
      expect(typeof shell.exploreTabs[id]).toBe('string');
    }
    expect(typeof shell.searchCatalogue).toBe('string');
    expect(typeof shell.exploreTabsLabel).toBe('string');
  });
});
