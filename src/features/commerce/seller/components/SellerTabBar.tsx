/**
 * Barre d'onglets propre à l'espace vendeur (T5) : 5 onglets, libellés en
 * majuscules, onglet actif en orange avec un point au-dessus.
 */

import React from 'react';
import {Pressable, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Text, useSellerColors, sellerMetrics} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {SellerTabIcon, type SellerTabId} from './SellerTabIcon';

export const SELLER_TABS: SellerTabId[] = [
  'overview',
  'products',
  'sales',
  'analytics',
  'more',
];

export type SellerTabBarProps = {
  active: SellerTabId;
  onChange: (tab: SellerTabId) => void;
};

export function SellerTabBar({active, onChange}: SellerTabBarProps) {
  const sellerColors = useSellerColors();
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityRole="tablist"
      testID="seller-tabbar"
      style={{
        backgroundColor: sellerColors.bg,
        borderTopColor: sellerColors.border,
        borderTopWidth: 1,
        flexDirection: 'row',
        height: sellerMetrics.tabBarHeight + insets.bottom,
        paddingBottom: insets.bottom,
      }}>
      {SELLER_TABS.map(id => {
        const focused = id === active;
        const color = focused ? sellerColors.accent : sellerColors.tabInactive;
        const label = t(`commerce.sellerSpace.tabs.${id}`);
        return (
          <Pressable
            key={id}
            onPress={() => onChange(id)}
            accessibilityRole="tab"
            accessibilityState={{selected: focused}}
            accessibilityLabel={label}
            testID={`seller-tab-${id}`}
            style={{alignItems: 'center', flex: 1, gap: 2, justifyContent: 'center'}}>
            <View
              style={{
                backgroundColor: focused ? sellerColors.accentDot : 'transparent',
                borderRadius: 3,
                height: 6,
                width: 6,
              }}
            />
            <SellerTabIcon id={id} color={color} />
            <Text
              variant="micro"
              numberOfLines={1}
              style={{color, letterSpacing: 0.4, textTransform: 'uppercase'}}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
