/**
 * Verre dépoli (DESIGN-TOKENS §9). Sans flou dans ce lot : fond semi-opaque
 * et bordure seulement. La bibliothèque de flou (Android 12+) est choisie à l'étape 2.
 */

import {withAlpha} from './colors';

export type GlassTokens = {
  bg: string;
  border: string;
  shadowColor: string;
};

export const lightGlass: GlassTokens = {
  bg: 'rgba(255, 255, 255, 0.86)',
  border: 'rgba(255, 255, 255, 0.55)',
  shadowColor: '#020617',
};

export const darkGlass: GlassTokens = {
  bg: withAlpha('#0F172A', 0.78),
  border: withAlpha('#94A3B8', 0.25),
  shadowColor: '#020617',
};
