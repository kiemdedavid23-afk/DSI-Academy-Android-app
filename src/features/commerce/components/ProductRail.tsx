/** Rangée horizontale de cartes (site : .dsi-mp-rail) avec titre et « Tout voir » facultatif. */

import React from 'react';
import {FlatList, Pressable, View} from 'react-native';
import {Icon, Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import type {CommerceProduct} from '../store/commerceTypes';
import {ProductCard} from './ProductCard';

const CARD_WIDTH = 150;

export type ProductRailProps = {
  title: string;
  items: CommerceProduct[];
  onOpenProduct: (product: CommerceProduct) => void;
  onSeeAll?: () => void;
  testID?: string;
};

export function ProductRail({title, items, onOpenProduct, onSeeAll, testID}: ProductRailProps) {
  const {t} = useTranslation();
  const {spacing, colors, touch} = useTheme();
  if (items.length === 0) {
    return null;
  }
  return (
    <View style={{gap: spacing.sm}} testID={testID}>
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.xl,
        }}>
        <Text variant="subtitle" accessibilityRole="header">
          {title}
        </Text>
        {onSeeAll ? (
          <Pressable
            onPress={onSeeAll}
            accessibilityRole="button"
            testID={testID ? `${testID}-see-all` : undefined}
            style={{alignItems: 'center', flexDirection: 'row', gap: 6, minHeight: touch.min}}>
            <Text variant="bodySmall" color="secondary">
              {t('commerce.shell.seeAll')}
            </Text>
            <Icon name="ArrowRightIcon" size={16} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={items}
        keyExtractor={p => p.id}
        contentContainerStyle={{gap: spacing.md, paddingHorizontal: spacing.xl}}
        renderItem={({item}) => (
          <View style={{width: CARD_WIDTH}}>
            <ProductCard product={item} onPress={onOpenProduct} />
          </View>
        )}
      />
    </View>
  );
}
