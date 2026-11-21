/** Ligne à barre horizontale : entonnoir de conversion et pays. */

import React from 'react';
import {View} from 'react-native';
import {Text, useSellerColors} from '@shared/designsystem';

export type SellerBarRowProps = {
  label: string;
  value: string;
  /** 0 à 1. */
  ratio: number;
  testID?: string;
};

export function SellerBarRow({label, value, ratio, testID}: SellerBarRowProps) {
  const sellerColors = useSellerColors();
  return (
    <View testID={testID} style={{gap: 4}}>
      <View style={{flexDirection: 'row', gap: 12, justifyContent: 'space-between'}}>
        <Text variant="bodySmall" numberOfLines={1} style={{color: sellerColors.ink, flexShrink: 1}}>
          {label}
        </Text>
        <Text variant="bodyStrong" style={{color: sellerColors.ink}}>
          {value}
        </Text>
      </View>
      <View style={{backgroundColor: sellerColors.surfaceMuted, borderRadius: 9999, height: 8}}>
        <View
          style={{
            backgroundColor: sellerColors.accentDot,
            borderRadius: 9999,
            height: 8,
            width: `${Math.round(ratio * 100)}%`,
          }}
        />
      </View>
    </View>
  );
}
