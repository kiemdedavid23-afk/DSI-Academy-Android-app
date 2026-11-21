/**
 * Couleurs de l'espace vendeur (docs/DESIGN-ESPACE-VENDEUR.md §2). Thème clair
 * mesuré sur les captures de référence ; thème sombre (lot S9) dérivé du clair,
 * contrastes vérifiés par test (WCAG AA). R-DS-1 : toute couleur de l'espace
 * vendeur vient d'ici, aucune valeur en dur dans `features/`. Les écrans lisent
 * la palette active avec `useSellerColors()`.
 */

export const sellerLightColors = {
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
  /** Fond de la carte de solde (sombre dans les deux thèmes). */
  balanceBg: '#111111',
  /** Voile derrière les feuilles du bas. */
  scrim: '#11111166',
  /** Texte posé sur un fond orange (boutons, pastille d'étape active). */
  onAccent: '#FFFFFF',
} as const;

export type SellerColors = {[K in keyof typeof sellerLightColors]: string};

/** Thème clair (valeurs de référence, figées par test). */
export const sellerColors: SellerColors = sellerLightColors;

/** Thème sombre : mêmes rôles, valeurs choisies pour garder les contrastes AA. */
export const sellerDarkColors: SellerColors = {
  statusBar: '#F59E0B',
  bg: '#0F0F10',
  surfaceMuted: '#232325',
  border: '#2E2E31',
  ink: '#F5F5F5',
  inkMuted: '#A8A8AD',
  inkOnDarkMuted: '#A3A3A3',
  onDark: '#FFFFFF',
  accent: '#FB923C',
  accentFrom: '#F97416',
  accentTo: '#F59D0B',
  accentDot: '#F78B10',
  tabInactive: '#8E8E93',
  positiveText: '#4ADE80',
  positiveBg: '#0F2A1A',
  positiveBadgeText: '#4ADE80',
  positiveBadgeBg: '#12301F',
  negativeText: '#F87171',
  negativeBg: '#2D1414',
  coverPeach: '#4A3326',
  coverSky: '#26384A',
  balanceBg: '#232325',
  scrim: '#000000AA',
  onAccent: '#FFFFFF',
};

/** Palette vendeur pour un thème donné. */
export function sellerColorsFor(isDark: boolean): SellerColors {
  return isDark ? sellerDarkColors : sellerColors;
}

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
