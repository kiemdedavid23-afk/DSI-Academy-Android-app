/**
 * Préférences de lecture communes aux lecteurs de texte et de livres
 * (site : useReadingPrefs) : thème, police, taille de 80 % à 200 %.
 * Mémorisées sur l'appareil, jamais purgées à la déconnexion.
 */

import {storageGet, storageSet} from '@core/storage';
import {createSimpleStore} from './simpleStore';

const KEY = 'dsi_reader_look';
export const FONT_MIN = 80;
export const FONT_MAX = 200;
export const FONT_STEP = 10;
export const READING_THEMES = ['light', 'sepia', 'night'] as const;
export const READING_FAMILIES = ['serif', 'sans'] as const;

export type ReadingTheme = (typeof READING_THEMES)[number];
export type ReadingFamily = (typeof READING_FAMILIES)[number];

export type ReaderLook = {
  theme: ReadingTheme;
  family: ReadingFamily;
  /** Taille du texte en pourcentage (100 = taille normale). */
  fontPercent: number;
};

const DEFAULTS: ReaderLook = {theme: 'light', family: 'serif', fontPercent: 100};

export function sanitizeLook(raw: unknown): ReaderLook {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<ReaderLook>;
  const size = Number(r.fontPercent);
  return {
    theme: READING_THEMES.includes(r.theme as ReadingTheme) ? (r.theme as ReadingTheme) : DEFAULTS.theme,
    family: READING_FAMILIES.includes(r.family as ReadingFamily) ? (r.family as ReadingFamily) : DEFAULTS.family,
    fontPercent: Number.isFinite(size)
      ? Math.max(FONT_MIN, Math.min(FONT_MAX, Math.round(size / FONT_STEP) * FONT_STEP))
      : DEFAULTS.fontPercent,
  };
}

const store = createSimpleStore<ReaderLook>(DEFAULTS);
let loaded = false;

export const readerLookStore = {
  getState: store.getState,
  subscribe: store.subscribe,

  async load(): Promise<void> {
    if (loaded) {
      return;
    }
    loaded = true;
    store.replace(sanitizeLook(await storageGet<unknown>(KEY, DEFAULTS)));
  },

  set(partial: Partial<ReaderLook>): void {
    const next = sanitizeLook({...store.getState(), ...partial});
    store.replace(next);
    void storageSet(KEY, next);
  },

  reset(): void {
    store.replace(DEFAULTS);
    void storageSet(KEY, DEFAULTS);
  },
};
