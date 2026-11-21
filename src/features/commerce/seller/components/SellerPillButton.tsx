/** Bouton pastille de l'espace vendeur : gris (secondaire) ou orange à dégradé. */

import React from 'react';
import {ActivityIndicator, Pressable, View} from 'react-native';
import {Text, useSellerColors, sellerMetrics} from '@shared/designsystem';
import {SellerGradientFill} from './SellerGradientFill';

export type SellerPillButtonProps = {
  label: string;
  onPress?: () => void;
  tone?: 'gray' | 'orange';
  /** Icône à gauche du libellé. */
  leading?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  testID?: string;
};

export function SellerPillButton({
  label,
  onPress,
  tone = 'gray',
  leading,
  disabled = false,
  loading = false,
  accessibilityLabel,
  testID,
}: SellerPillButtonProps) {
  const sellerColors = useSellerColors();
  const orange = tone === 'orange';
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={inactive ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{disabled: inactive, busy: loading}}
      testID={testID}
      style={({pressed}) => ({
        alignItems: 'center',
        backgroundColor: orange ? sellerColors.accentTo : sellerColors.surfaceMuted,
        borderRadius: 9999,
        flexDirection: 'row',
        justifyContent: 'center',
        minHeight: sellerMetrics.pillHeight,
        opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        overflow: 'hidden',
        paddingHorizontal: 20,
      })}>
      {orange ? <SellerGradientFill /> : null}
      <View style={{alignItems: 'center', flexDirection: 'row', gap: 8}}>
        {loading ? (
          <ActivityIndicator
            size="small"
            color={orange ? sellerColors.onAccent : sellerColors.ink}
          />
        ) : (
          leading
        )}
        <Text
          variant="bodyStrong"
          numberOfLines={1}
          style={{color: orange ? sellerColors.onAccent : sellerColors.ink}}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
