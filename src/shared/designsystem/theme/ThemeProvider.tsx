/**
 * Fournit le thème à toute l'app : couleurs clair/sombre, typographie, rayons,
 * espacements, élévations, verre et mouvement. Honore deux réglages :
 *  - thème : `system` (suit Android), `light` ou `dark` ;
 *  - « réduire les animations » : réglage de l'app OU réglage d'accessibilité Android.
 */

import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';
import {AccessibilityInfo, useColorScheme} from 'react-native';
import {darkColors, lightColors, type ColorTokens} from './colors';
import {darkElevation, lightElevation, type ElevationTokens} from './elevation';
import {darkGlass, lightGlass, type GlassTokens} from './glass';
import {motion} from './motion';
import {radii} from './radii';
import {spacing} from './spacing';
import {
  useThemePreferences,
  type ThemePreference,
} from './themePreferences';
import {touch} from './touch';
import {typography} from './typography';

export type ThemeMode = 'light' | 'dark';

export type Theme = {
  mode: ThemeMode;
  isDark: boolean;
  reduceMotion: boolean;
  colors: ColorTokens;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
  elevation: ElevationTokens;
  glass: GlassTokens;
  touch: typeof touch;
  motion: typeof motion;
};

/** Thème effectif selon la préférence et le thème du système. */
export function resolveMode(
  preference: ThemePreference,
  systemScheme: string | null | undefined,
): ThemeMode {
  if (preference === 'light' || preference === 'dark') {
    return preference;
  }
  return systemScheme === 'dark' ? 'dark' : 'light';
}

/** Vrai si l'un des deux réglages (app, système) demande de réduire les animations. */
export function resolveReduceMotion(
  appPreference: boolean,
  systemPreference: boolean,
): boolean {
  return appPreference || systemPreference;
}

export function buildTheme(mode: ThemeMode, reduceMotion: boolean): Theme {
  const isDark = mode === 'dark';
  return {
    mode,
    isDark,
    reduceMotion,
    colors: isDark ? darkColors : lightColors,
    spacing,
    radii,
    typography,
    elevation: isDark ? darkElevation : lightElevation,
    glass: isDark ? darkGlass : lightGlass,
    touch,
    motion,
  };
}

/** Réglage d'accessibilité Android « supprimer les animations », avec écoute des changements. */
export function useSystemReduceMotion(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(value => {
        if (active) {
          setEnabled(value);
        }
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      value => {
        if (active) {
          setEnabled(value);
        }
      },
    );
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return enabled;
}

const ThemeContext = createContext<Theme | null>(null);

type ThemeProviderProps = {
  children: React.ReactNode;
};

export function ThemeProvider({children}: ThemeProviderProps) {
  const preferences = useThemePreferences();
  const systemScheme = useColorScheme();
  const systemReduceMotion = useSystemReduceMotion();

  const mode = resolveMode(preferences.theme, systemScheme);
  const reduceMotion = resolveReduceMotion(
    preferences.reduceMotion,
    systemReduceMotion,
  );

  const theme = useMemo(() => buildTheme(mode, reduceMotion), [mode, reduceMotion]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (theme === null) {
    throw new Error('useTheme doit être utilisé dans un ThemeProvider.');
  }
  return theme;
}
