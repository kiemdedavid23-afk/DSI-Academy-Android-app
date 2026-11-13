/**
 * Chronologie du loader de marque (une boucle). Valeurs en millisecondes.
 * Le D se remplit, puis le S, puis le I ; le tout reste plein un instant,
 * s'estompe, puis la boucle recommence.
 */
export const BRAND_LOADER_CYCLE_MS = 2600;

export type LetterKey = 'd' | 's' | 'i';

export const LETTER_ORDER: readonly LetterKey[] = ['d', 's', 'i'];

/** Début et fin du remplissage de chaque lettre (ms depuis le début de la boucle). */
export const LETTER_WINDOWS: Record<LetterKey, {start: number; end: number}> = {
  d: {start: 0, end: 800},
  s: {start: 800, end: 1400},
  i: {start: 1400, end: 2000},
};

/** Moment où le logo plein commence à s'estomper, et fin de la boucle. */
export const FADE_START_MS = 2400;

/** Hauteur remplie (0 à 1) d'une lettre à l'instant t de la boucle. */
export function letterFill(letter: LetterKey, t: number): number {
  const {start, end} = LETTER_WINDOWS[letter];
  if (t <= start) {
    return 0;
  }
  if (t >= end) {
    return 1;
  }
  return (t - start) / (end - start);
}

/** Opacité de la partie remplie à l'instant t : pleine, puis estompée en fin de boucle. */
export function litOpacity(t: number): number {
  if (t <= FADE_START_MS) {
    return 1;
  }
  if (t >= BRAND_LOADER_CYCLE_MS) {
    return 0;
  }
  return 1 - (t - FADE_START_MS) / (BRAND_LOADER_CYCLE_MS - FADE_START_MS);
}
