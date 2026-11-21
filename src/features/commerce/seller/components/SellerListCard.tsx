/** Carte blanche à contour : titre de section et lignes (commandes, produits). */

import React from 'react';
import {View} from 'react-native';
import {Text, useSellerColors, sellerMetrics} from '@shared/designsystem';

export type SellerListCardProps = {
  title: string;
  children: React.ReactNode;
  testID?: string;
};

export function SellerListCard({title, children, testID}: SellerListCardProps) {
  const sellerColors = useSellerColors();
  return (
    <View
      testID={testID}
      style={{
        backgroundColor: sellerColors.bg,
        borderColor: sellerColors.border,
        borderRadius: sellerMetrics.cardRadius,
        borderWidth: 1,
        gap: 12,
        padding: sellerMetrics.cardPadding,
      }}>
      <Text variant="subtitle" accessibilityRole="header" style={{color: sellerColors.ink}}>
        {title}
      </Text>
      {children}
    </View>
  );
}

export type SellerRowProps = {
  title: string;
  subtitle?: string;
  trailing: string;
  testID?: string;
};

/** Ligne : titre et sous-titre à gauche, montant à droite. */
export function SellerRow({title, subtitle, trailing, testID}: SellerRowProps) {
  const sellerColors = useSellerColors();
  return (
    <View
      testID={testID}
      style={{alignItems: 'center', flexDirection: 'row', gap: 12}}>
      <View style={{flex: 1}}>
        <Text variant="bodyStrong" numberOfLines={1} style={{color: sellerColors.ink}}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" numberOfLines={1} style={{color: sellerColors.inkMuted}}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Text variant="bodyStrong" style={{color: sellerColors.ink}}>
        {trailing}
      </Text>
    </View>
  );
}
