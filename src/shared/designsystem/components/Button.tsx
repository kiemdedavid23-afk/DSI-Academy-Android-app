// src/shared/designsystem/components/Button.tsx
import React from 'react';
import { Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';

type Props = {
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
  children: React.ReactNode;
  accessibilityLabel: string;
};

export function Button({ variant = 'primary', disabled, loading, onPress, children, accessibilityLabel }: Props) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const styles = {
    primary: { bg: theme.colors.bluePrimary, text: theme.colors.textOnDark },
    secondary: { bg: theme.colors.bgSurfaceAlt, text: theme.colors.textPrimary },
    ghost: { bg: 'transparent', text: theme.colors.bluePrimary },
  }[variant];

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isDisabled }}
      style={({ pressed }) => [
        {
          minHeight: theme.touch.min,
          paddingHorizontal: theme.spacing.lg,
          borderRadius: theme.radii.md,
          backgroundColor: styles.bg,
          justifyContent: 'center',
          alignItems: 'center',
          opacity: pressed && !isDisabled ? 0.8 : 1,
        },
      ]}
    >
      {loading ? <ActivityIndicator color={styles.text} /> : <Text variant="button" color={variant === 'primary' ? 'onDark' : 'primary'}>{children}</Text>}
    </Pressable>
  );
}