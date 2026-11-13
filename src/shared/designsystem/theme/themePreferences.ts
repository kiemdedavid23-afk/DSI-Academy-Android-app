/**
 * Préférences d'affichage de l'app (thème, « réduire les animations »).
 * API publique inchangée. La persistance est assurée par preferencesStore (L0d),
 * qui écrit ici après hydratation et à chaque changement.
 */

import {useSyncExternalStore} from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';

export type Preferences = {
  theme: ThemePreference;
  reduceMotion: boolean;
};

const DEFAULTS: Preferences = {theme: 'system', reduceMotion: false};

let prefs: Preferences = DEFAULTS;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach(listener => listener());
}

export const themePreferences = {
  get: (): Preferences => prefs,
  setTheme: (theme: ThemePreference): void => {
    prefs = {...prefs, theme};
    emit();
  },
  setReduceMotion: (reduceMotion: boolean): void => {
    prefs = {...prefs, reduceMotion};
    emit();
  },
  /** Remet les valeurs par défaut (tests, déconnexion). */
  reset: (): void => {
    prefs = DEFAULTS;
    emit();
  },
  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export function useThemePreferences(): Preferences {
  return useSyncExternalStore(
    themePreferences.subscribe,
    themePreferences.get,
    themePreferences.get,
  );
}
