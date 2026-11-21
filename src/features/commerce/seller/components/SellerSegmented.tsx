/** Onglets segmentés (Tous · 15 / Publiés · 15 / Brouillons · 0), capture Produits. */

import React from 'react';
import {Pressable, View} from 'react-native';
import {Text, sellerColors} from '@shared/designsystem';

export type SellerSegmentedProps<T extends string> = {
  options: Array<{id: T; label: string}>;
  value: T;
  onChange: (id: T) => void;
  testID?: string;
};

export function SellerSegmented<T extends string>({
  options,
  value,
  onChange,
  testID,
}: SellerSegmentedProps<T>) {
  return (
    <View
      testID={testID}
      accessibilityRole="tablist"
      style={{
        backgroundColor: sellerColors.surfaceMuted,
        borderRadius: 9999,
        flexDirection: 'row',
        padding: 4,
      }}>
      {options.map(o => {
        const active = o.id === value;
        return (
          <Pressable
            key={o.id}
            onPress={() => onChange(o.id)}
            accessibilityRole="tab"
            accessibilityState={{selected: active}}
            style={{
              alignItems: 'center',
              backgroundColor: active ? sellerColors.bg : 'transparent',
              borderRadius: 9999,
              flex: 1,
              justifyContent: 'center',
              minHeight: 44,
              paddingHorizontal: 8,
            }}>
            <Text variant="bodySmall" numberOfLines={1} style={{color: sellerColors.ink, fontWeight: active ? '700' : '500'}}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
