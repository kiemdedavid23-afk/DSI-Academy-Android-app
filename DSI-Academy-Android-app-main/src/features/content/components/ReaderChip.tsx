/** Pastille de choix des lecteurs (vitesse, thème, police, minuteur…). */

import React from 'react';
import {Pressable} from 'react-native';
import {Text, useTheme, withAlpha} from '@shared/designsystem';

export type ReaderChipProps = {
  label: string;
  active?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
  testID?: string;
};

export function ReaderChip({label, active = false, onPress, accessibilityLabel, testID}: ReaderChipProps) {
  const {colors, spacing, radii, touch} = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{selected: active}}
      testID={testID}
      style={({pressed}) => ({
        alignItems: 'center',
        backgroundColor: active ? withAlpha(colors.goldPrestige, 0.18) : colors.bgSurfaceAlt,
        borderColor: active ? colors.goldBorder : colors.borderLight,
        borderRadius: radii.pill,
        borderWidth: 1,
        justifyContent: 'center',
        minHeight: touch.min,
        opacity: pressed ? 0.85 : 1,
        paddingHorizontal: spacing.lg,
      })}>
      <Text variant="bodySmallStrong" color={active ? 'primary' : 'secondary'}>
        {label}
      </Text>
    </Pressable>
  );
}
