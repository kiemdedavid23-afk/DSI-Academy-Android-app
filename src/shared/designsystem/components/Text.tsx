import React from 'react';
import {Text as RNText, type TextProps as RNTextProps} from 'react-native';
import {useTheme, type Theme} from '../theme/ThemeProvider';
import {MAX_FONT_SIZE_MULTIPLIER, type TypographyVariant} from '../theme/typography';
import {textStyle} from './textStyle';

export type TextColor =
  | 'primary'
  | 'secondary'
  | 'muted'
  | 'onDark'
  | 'link'
  | 'gold'
  | 'error'
  | 'success'
  | 'warning'
  | 'info';

export type TextProps = RNTextProps & {
  variant?: TypographyVariant;
  color?: TextColor;
  /** Italique : Fraunces (poids 400 à 600) seulement. */
  italic?: boolean;
};

export function resolveTextColor(theme: Theme, color: TextColor): string {
  const c = theme.colors;
  switch (color) {
    case 'primary':
      return c.textPrimary;
    case 'secondary':
      return c.textSecondary;
    case 'muted':
      return c.textMuted;
    case 'onDark':
      return c.textOnDark;
    case 'link':
      return c.blueActive;
    case 'gold':
      return c.goldPrestige;
    case 'error':
      return c.error;
    case 'success':
      return c.success;
    case 'warning':
      return c.warning;
    case 'info':
      return c.info;
  }
}

/**
 * Texte de l'app. Toute taille, famille et couleur vient du thème (R-DS-1).
 * L'agrandissement du texte système est plafonné (DESIGN-TOKENS §6).
 */
export function Text({
  variant = 'body',
  color = 'primary',
  italic = false,
  style,
  maxFontSizeMultiplier = MAX_FONT_SIZE_MULTIPLIER,
  ...rest
}: TextProps) {
  const theme = useTheme();
  return (
    <RNText
      {...rest}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[
        textStyle(theme, variant, italic),
        {color: resolveTextColor(theme, color)},
        style,
      ]}
    />
  );
}
