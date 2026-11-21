/**
 * Couleurs de l'espace vendeur (docs/DESIGN-ESPACE-VENDEUR.md §2), mesurées
 * sur les captures de référence. Thème clair seulement (le sombre viendra au
 * lot S9). R-DS-1 : toute couleur de l'espace vendeur vient d'ici, aucune
 * valeur en dur dans `features/`.
 */

export const sellerColors = {
  statusBar: '#F59E0B',
  bg: '#FFFFFF',
  surfaceMuted: '#F1EEE9',
  border: '#E6E2DB',
  ink: '#111111',
  inkMuted: '#5F5F5F',
  inkOnDarkMuted: '#A3A3A3',
  onDark: '#FFFFFF',
  accent: '#C2410C',
  accentFrom: '#F97416',
  accentTo: '#F59D0B',
  accentDot: '#F78B10',
  tabInactive: '#767676',
  positiveText: '#15803D',
  positiveBg: '#ECFDF3',
  positiveBadgeText: '#16A34A',
  positiveBadgeBg: '#F0FDF4',
  negativeText: '#B91C1C',
  negativeBg: '#FEF2F2',
  coverPeach: '#EFD3C1',
  coverSky: '#D5E4EE',
} as const;

export type SellerColors = typeof sellerColors;

/** Dimensions en dp (même document, §3). */
export const sellerMetrics = {
  margin: 16,
  gap: 12,
  pillHeight: 44,
  roundButton: 44,
  cardRadius: 24,
  cardPadding: 16,
  tabBarHeight: 64,
} as const;
