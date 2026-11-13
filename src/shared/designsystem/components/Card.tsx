import React from 'react';
import {View, type StyleProp, type ViewStyle} from 'react-native';
import {useTheme} from '../theme/ThemeProvider';

export type CardVariant = 'default' | 'accent' | 'glass';

export type CardProps = {
  children?: React.ReactNode;
  /**
   * default : surface ; accent : fond or clair + bordure or (élément actif ou favori) ;
   * glass : verre dépoli, sans flou dans ce lot.
   */
  variant?: CardVariant;
  /** Marge intérieure (défaut : oui, `lg`). */
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Card({
  children,
  variant = 'default',
  padded = true,
  style,
  testID,
}: CardProps) {
  const theme = useTheme();
  const {colors, glass, elevation, radii, spacing} = theme;

  const look =
    variant === 'accent'
      ? {bg: colors.goldLight, border: colors.goldBorder, shadow: elevation.shadowColor}
      : variant === 'glass'
      ? {bg: glass.bg, border: glass.border, shadow: glass.shadowColor}
      : {bg: colors.bgSurface, border: colors.borderLight, shadow: elevation.shadowColor};

  return (
    <View
      testID={testID}
      style={[
        {
          backgroundColor: look.bg,
          borderColor: look.border,
          borderWidth: 1,
          borderRadius: radii.lg,
          padding: padded ? spacing.lg : 0,
          elevation: elevation.card,
          shadowColor: look.shadow,
        },
        style,
      ]}>
      {children}
    </View>
  );
}
