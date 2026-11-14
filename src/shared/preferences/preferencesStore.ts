/**
 * Préférences utilisateur persistées (langue, thème, reduceMotion, showAmountsXof).
 * Reprend le modèle du site (preferencesStore.js) avec AsyncStorage.
 * Les préférences ne sont PAS purgées à la déconnexion.
 */

import {useSyncExternalStore} from 'react';
import {storageGet, storageSet} from '@core/storage';
import {
  themePreferences,
  type ThemePreference,
} from '../designsystem/theme/themePreferences';

const STORAGE_KEY = 'dsi_preferences';

export type AppPreferences = {
  language: 'fr' | 'en';
  theme: ThemePreference;
  reduceMotion: boolean;
  showAmountsXof: boolean;
};

const DEFAULTS: AppPreferences = {
  language: 'fr',
  theme: 'light',
  reduceMotion: false,
  showAmountsXof: true,
};

function isTheme(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

function isLanguage(value: unknown): value is 'fr' | 'en' {
  return value === 'fr' || value === 'en';
}

function sanitize(raw: unknown): AppPreferences {
  if (!raw || typeof raw !== 'object') {
    return {...DEFAULTS};
  }
  const input = raw as Record<string, unknown>;
  return {
    language: isLanguage(input.language) ? input.language : DEFAULTS.language,
    theme: isTheme(input.theme) ? input.theme : DEFAULTS.theme,
    reduceMotion:
      typeof input.reduceMotion === 'boolean'
        ? input.reduceMotion
        : DEFAULTS.reduceMotion,
    showAmountsXof:
      typeof input.showAmountsXof === 'boolean'
        ? input.showAmountsXof
        : DEFAULTS.showAmountsXof,
  };
}

let current: AppPreferences = {...DEFAULTS};
let hydrated = false;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach(listener => listener());
}

function applyToTheme(prefs: AppPreferences): void {
  themePreferences.setTheme(prefs.theme);
  themePreferences.setReduceMotion(prefs.reduceMotion);
}

async function persist(prefs: AppPreferences): Promise<void> {
  await storageSet(STORAGE_KEY, prefs);
}

export const preferencesStore = {
  get(): AppPreferences {
    return current;
  },

  isHydrated(): boolean {
    return hydrated;
  },

  /**
   * Charge depuis le stockage. À appeler une fois au démarrage avant d'afficher
   * la navigation, pour éviter un flash de thème.
   */
  async hydrate(): Promise<AppPreferences> {
    const stored = await storageGet<unknown>(STORAGE_KEY, null);
    current = sanitize(stored);
    hydrated = true;
    applyToTheme(current);
    emit();
    return current;
  },

  async set(partial: Partial<AppPreferences>): Promise<AppPreferences> {
    const next = sanitize({...current, ...partial});
    current = next;
    applyToTheme(next);
    emit();
    await persist(next);
    return next;
  },

  async setLanguage(language: 'fr' | 'en'): Promise<AppPreferences> {
    return this.set({language: language === 'en' ? 'en' : 'fr'});
  },

  async setTheme(theme: ThemePreference): Promise<AppPreferences> {
    const value: ThemePreference =
      theme === 'dark' || theme === 'system' ? theme : 'light';
    return this.set({theme: value});
  },

  async setReduceMotion(value: boolean): Promise<AppPreferences> {
    return this.set({reduceMotion: Boolean(value)});
  },

  async setShowAmountsXof(value: boolean): Promise<AppPreferences> {
    return this.set({showAmountsXof: Boolean(value)});
  },

  /** Remet les défauts (tests). Ne purge pas le stockage sans appel explicite. */
  async reset(): Promise<AppPreferences> {
    current = {...DEFAULTS};
    applyToTheme(current);
    emit();
    await persist(current);
    return current;
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export function usePreferences(): AppPreferences {
  return useSyncExternalStore(
    preferencesStore.subscribe,
    preferencesStore.get,
    preferencesStore.get,
  );
}
