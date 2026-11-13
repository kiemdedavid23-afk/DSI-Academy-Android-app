import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {useTheme} from '../theme/ThemeProvider';
import {Text, type TextColor} from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  /** Libellé lu par TalkBack. Par défaut : `label`. */
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Bouton. Manrope uniquement (R-DS-2), 48 dp minimum, appui visible.
 * Désactivé ou en chargement : `onPress` n'est jamais appelé.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  accessibilityLabel,
  testID,
  style,
}: ButtonProps) {
  const theme = useTheme();
  const c = theme.colors;
  const inactive = disabled || loading;

  const look: {bg: string; border: string; text: TextColor; spinner: string} =
    variant === 'primary'
      ? {bg: c.bluePrimary, border: c.bluePrimary, text: 'onDark', spinner: c.textOnDark}
      : variant === 'secondary'
      ? {bg: c.bgSurfaceAlt, border: c.borderLight, text: 'primary', spinner: c.textPrimary}
      : {bg: 'transparent', border: 'transparent', text: 'link', spinner: c.blueActive};

  return (
    <Pressable
      testID={testID}
      onPress={inactive ? undefined : onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{disabled: inactive, busy: loading}}
      style={({pressed}) => [
        styles.base,
        {
          minHeight: theme.touch.min,
          paddingHorizontal: theme.spacing.lg,
          borderRadius: theme.radii.md,
          backgroundColor: look.bg,
          borderColor: look.border,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={look.spinner} />
      ) : (
        <Text variant="button" color={look.text}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
