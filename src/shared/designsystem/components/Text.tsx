// src/shared/designsystem/components/Text.tsx
import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { fontFamily } from '../theme/fonts';

type Props = TextProps & {
  variant?: keyof ReturnType<typeof useTheme>['typography'];
  color?: 'primary' | 'secondary' | 'muted' | 'onDark' | 'link' | 'error';
};

export function Text({ variant = 'body', color = 'primary', style, maxFontSizeMultiplier = 1.3, ...rest }: Props) {
  const theme = useTheme();
  const role = theme.typography[variant] ?? theme.typography.body;
  const family = fontFamily(role.family, role.weight);
  const colorMap = {
    primary: theme.colors.textPrimary,
    secondary: theme.colors.textSecondary,
    muted: theme.colors.textMuted,
    onDark: theme.colors.textOnDark,
    link: theme.colors.bluePrimary,
    error: theme.colors.error,
  };

  return (
    <RNText
      style={[
        { fontFamily: family, fontSize: role.size, lineHeight: role.size * role.lineHeight, color: colorMap[color] },
        style,
      ]}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      {...rest}
    />
  );
}