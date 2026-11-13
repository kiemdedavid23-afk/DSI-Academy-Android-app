// src/shared/designsystem/theme/themePreferences.ts
import { useSyncExternalStore } from 'react';

type ThemePref = 'system' | 'light' | 'dark';
type Prefs = { theme: ThemePref; reduceMotion: boolean };

let prefs: Prefs = { theme: 'system', reduceMotion: false };
const listeners = new Set<() => void>();

export const themePreferences = {
  get: () => prefs,
  setTheme: (theme: ThemePref) => {
    prefs = { ...prefs, theme };
    listeners.forEach(l => l());
  },
  setReduceMotion: (v: boolean) => {
    prefs = { ...prefs, reduceMotion: v };
    listeners.forEach(l => l());
  },
  subscribe: (cb: () => void) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
};

export function useThemePreferences() {
  return useSyncExternalStore(themePreferences.subscribe, themePreferences.get);
}