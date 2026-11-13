/**
 * Polices embarquées (src/assets/fonts, générées par le workflow fetch-fonts).
 * Sur Android, `fontFamily` = nom du fichier sans extension (une coupe par fichier).
 * Une combinaison inconnue lève une erreur : jamais de repli silencieux.
 */

export type FontFamily = 'royal' | 'sans' | 'mono';
export type FontWeight = '400' | '500' | '600' | '700' | '800';

/** Familles (DESIGN-TOKENS §6) : royal = Fraunces, sans = Manrope, mono = IBM Plex Mono. */
const FONT_FILES: Record<string, string> = {
  'royal-400': 'Fraunces-Regular',
  'royal-500': 'Fraunces-Medium',
  'royal-600': 'Fraunces-SemiBold',
  'royal-700': 'Fraunces-Bold',
  'royal-400-italic': 'Fraunces-Italic',
  'royal-500-italic': 'Fraunces-MediumItalic',
  'royal-600-italic': 'Fraunces-SemiBoldItalic',
  'sans-400': 'Manrope-Regular',
  'sans-500': 'Manrope-Medium',
  'sans-600': 'Manrope-SemiBold',
  'sans-700': 'Manrope-Bold',
  'sans-800': 'Manrope-ExtraBold',
  'mono-500': 'IBMPlexMono-Medium',
};

/** Fichiers `.ttf` que le workflow fetch-fonts doit déposer dans src/assets/fonts. */
export const EXPECTED_FONT_FILES: readonly string[] = Object.values(
  FONT_FILES,
).map(name => `${name}.ttf`);

export function fontFamily(
  family: FontFamily,
  weight: FontWeight,
  italic = false,
): string {
  const key = `${family}-${weight}${italic ? '-italic' : ''}`;
  const name = FONT_FILES[key];
  if (!name) {
    throw new Error(`fontFamily: coupe non embarquée "${key}"`);
  }
  return name;
}
