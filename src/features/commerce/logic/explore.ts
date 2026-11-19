/**
 * Section Explorer (Marketplace et Boutique) : sous-sections et tri.
 * Le Worker n'a ni paramètre de tri ni pagination : le tri se fait côté app,
 * sur la liste reçue. Calcul pur, sans réseau.
 */

import type {CommerceProduct, CommerceSource} from '../store/commerceTypes';

export type ExploreTab = 'search' | 'categories' | 'sellers';
export type SortKey = 'popularity' | 'newest' | 'priceAsc' | 'priceDesc';

export const SORT_KEYS: readonly SortKey[] = ['popularity', 'newest', 'priceAsc', 'priceDesc'];
export const DEFAULT_SORT: SortKey = 'popularity';

/** Boutique : pas de Vendeurs. */
export function exploreTabsFor(source: CommerceSource): readonly ExploreTab[] {
  return source === 'marketplace'
    ? ['search', 'categories', 'sellers']
    : ['search', 'categories'];
}

const byPopularity = (a: CommerceProduct, b: CommerceProduct) =>
  b.reviewCount - a.reviewCount ||
  (b.reviewAvg ?? 0) - (a.reviewAvg ?? 0) ||
  (b.createdAt ?? 0) - (a.createdAt ?? 0);

/** Copie triée ; à égalité, l'ordre d'origine est gardé (tri stable). */
export function sortProducts(items: CommerceProduct[], key: SortKey): CommerceProduct[] {
  const sorters: Record<SortKey, (a: CommerceProduct, b: CommerceProduct) => number> = {
    popularity: byPopularity,
    newest: (a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0),
    priceAsc: (a, b) => a.priceDsi - b.priceDsi,
    priceDesc: (a, b) => b.priceDsi - a.priceDsi,
  };
  return items
    .map((item, index) => ({item, index}))
    .sort((a, b) => sorters[key](a.item, b.item) || a.index - b.index)
    .map(entry => entry.item);
}
