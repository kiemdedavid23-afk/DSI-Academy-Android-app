/** Carte d'indicateur de l'Aperçu : libellé, valeur, variation et comparaison. */

import React from 'react';
import {View} from 'react-native';
import {Text, useSellerColors, sellerMetrics} from '@shared/designsystem';

export type SellerStatCardProps = {
  label: string;
  value: string;
  /** Texte de variation (« En hausse de 12 % ») ; absent = rien. */
  deltaText?: string;
  deltaTone?: 'positive' | 'negative' | 'neutral';
  /** Ligne grise sous la variation (« vs période précédente »). */
  compareText?: string;
  testID?: string;
};

export function SellerStatCard({
  label,
  value,
  deltaText,
  deltaTone = 'neutral',
  compareText,
  testID,
}: SellerStatCardProps) {
  const sellerColors = useSellerColors();
  const deltaColor =
    deltaTone === 'positive'
      ? sellerColors.positiveText
      : deltaTone === 'negative'
      ? sellerColors.negativeText
      : sellerColors.inkMuted;
  return (
    <View
      testID={testID}
      style={{
        backgroundColor: sellerColors.bg,
        borderColor: sellerColors.border,
        borderRadius: sellerMetrics.cardRadius,
        borderWidth: 1,
        flex: 1,
        gap: 4,
        padding: sellerMetrics.cardPadding,
      }}>
      <Text variant="bodySmall" style={{color: sellerColors.inkMuted}}>
        {label}
      </Text>
      <Text variant="display" numberOfLines={1} adjustsFontSizeToFit style={{color: sellerColors.ink}}>
        {value}
      </Text>
      {deltaText ? (
        <Text variant="caption" style={{color: deltaColor}}>
          {deltaText}
        </Text>
      ) : null}
      {compareText ? (
        <Text variant="caption" style={{color: sellerColors.inkMuted}}>
          {compareText}
        </Text>
      ) : null}
    </View>
  );
}
