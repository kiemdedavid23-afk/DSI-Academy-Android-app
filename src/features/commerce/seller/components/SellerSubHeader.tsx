/** Barre de retour des sous-écrans de Plus : chevron, libellé « Plus » et titre. */

import React from 'react';
import {Pressable, View} from 'react-native';
import {Icon, Text, useSellerColors, sellerMetrics} from '@shared/designsystem';

export type SellerSubHeaderProps = {
  title: string;
  backLabel: string;
  onBack: () => void;
  testID?: string;
};

export function SellerSubHeader({title, backLabel, onBack, testID}: SellerSubHeaderProps) {
  const sellerColors = useSellerColors();
  return (
    <View style={{gap: 8, paddingHorizontal: sellerMetrics.margin, paddingBottom: 8}}>
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel={backLabel}
        testID={testID}
        hitSlop={8}
        style={{alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row', gap: 4, minHeight: 44}}>
        <Icon name="ChevronLeftIcon" size={18} color={sellerColors.inkMuted} />
        <Text variant="bodySmallStrong" style={{color: sellerColors.inkMuted}}>
          {backLabel}
        </Text>
      </Pressable>
      <Text variant="display" accessibilityRole="header" style={{color: sellerColors.ink}}>
        {title}
      </Text>
    </View>
  );
}
