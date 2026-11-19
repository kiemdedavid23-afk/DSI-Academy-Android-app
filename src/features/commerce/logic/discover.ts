/**
 * Données de la section Découvrir (Marketplace et Boutique) : produit à la une,
 * rails Tendances et Nouveautés, grille par rangées. Calcul pur, sans réseau.
 */

import type {CommerceProduct} from '../store/commerceTypes';

export const RAIL_MAX = 10;
export const TRENDING_MAX = 40;

/** Les plus récents d'abord (createdAt absent = le plus ancien). */
export function newestOf(items: CommerceProduct[], limit = RAIL_MAX): CommerceProduct[] {
  return [...items]
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
    .slice(0, limit);
}

/**
 * Tendances : la liste du serveur telle quelle (Marketplace). Sans liste serveur
 * (Boutique, ou liste vide), le catalogue est classé par nombre d'avis, puis note,
 * puis nouveauté.
 */
export function trendingOf(
  serverTrending: CommerceProduct[],
  catalogue: CommerceProduct[],
  limit = TRENDING_MAX,
): CommerceProduct[] {
  if (serverTrending.length > 0) {
    return serverTrending.slice(0, limit);
  }
  return [...catalogue]
    .sort(
      (a, b) =>
        b.reviewCount - a.reviewCount ||
        (b.reviewAvg ?? 0) - (a.reviewAvg ?? 0) ||
        (b.createdAt ?? 0) - (a.createdAt ?? 0),
    )
    .slice(0, limit);
}

/** Produit à la une : le premier des tendances, sinon le premier du catalogue. */
export function featuredOf(
  trending: CommerceProduct[],
  catalogue: CommerceProduct[],
): CommerceProduct | null {
  return trending[0] ?? catalogue[0] ?? null;
}

/** Rangées de `size` éléments (la dernière peut être plus courte). */
export function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}
