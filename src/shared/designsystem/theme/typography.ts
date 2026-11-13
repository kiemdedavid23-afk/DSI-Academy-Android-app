/**
 * Typographie (DESIGN-TOKENS §6, R-DS-2).
 * Tailles en sp = valeur du site en rem x 16, ramenée à la liste autorisée.
 * Fraunces : titres, salutations et grands chiffres seulement, jamais sous 14 sp,
 * jamais sur un bouton, un formulaire ou un tableau. Manrope partout ailleurs.
 * Rôles construits sur l'usage réel des CSS du site [À CONFIRMER sur APK].
 */

import type {FontFamily, FontWeight} from './fonts';

export const ALLOWED_SIZES = [
  10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 24, 26, 32, 38,
] as const;

export type AllowedSize = (typeof ALLOWED_SIZES)[number];

export type TypographyRole = {
  family: FontFamily;
  size: AllowedSize;
  weight: FontWeight;
  /** Interligne en pixels (React Native n'accepte pas un ratio). */
  lineHeight: number;
};

/** Interligne : ratio x taille, arrondi à l'entier. */
export function lineHeightPx(size: number, ratio: number): number {
  return Math.round(size * ratio);
}

function role(
  family: FontFamily,
  size: AllowedSize,
  weight: FontWeight,
  ratio: number,
): TypographyRole {
  return {family, size, weight, lineHeight: lineHeightPx(size, ratio)};
}

/** Ratio d'interligne du corps (global.css : line-height 1.5). */
export const BODY_LINE_RATIO = 1.5;

export const typography = {
  // Fraunces : titres, salutations, grands chiffres
  bigNumber: role('royal', 38, '700', 1.1), // soldes (.dsi-home-balance-value)
  display: role('royal', 32, '700', 1.15), // montants (.dsi-su-amount-value)
  title: role('royal', 26, '600', 1.25), // titres d'écran (h1)
  greeting: role('royal', 24, '600', 1.3), // salutation (.dsi-home-hello)
  heading: role('royal', 22, '600', 1.3),
  subtitle: role('royal', 18, '600', 1.35),
  // Manrope : tout le reste
  body: role('sans', 16, '400', BODY_LINE_RATIO),
  bodyStrong: role('sans', 16, '600', BODY_LINE_RATIO),
  bodyMedium: role('sans', 15, '500', BODY_LINE_RATIO),
  bodySmall: role('sans', 14, '400', BODY_LINE_RATIO),
  bodySmallStrong: role('sans', 14, '600', BODY_LINE_RATIO),
  button: role('sans', 14, '600', 1.2),
  field: role('sans', 16, '400', 1.3), // champs : 1 rem
  label: role('sans', 13, '700', 1.4), // libellés de champ (.dsi-cpf-field label)
  caption: role('sans', 12, '400', 1.4),
  captionStrong: role('sans', 12, '700', 1.4),
  micro: role('sans', 11, '600', 1.3),
  overline: role('sans', 10, '700', 1.2),
  // IBM Plex Mono : petits libellés techniques
  mono: role('mono', 12, '500', 1.4),
} as const satisfies Record<string, TypographyRole>;

export type TypographyVariant = keyof typeof typography;

/** Plafond de l'agrandissement du texte système (DESIGN-TOKENS §6) [À CONFIRMER]. */
export const MAX_FONT_SIZE_MULTIPLIER = 1.3;
