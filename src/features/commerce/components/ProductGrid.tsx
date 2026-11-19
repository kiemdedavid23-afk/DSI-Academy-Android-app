/** Grille de cartes en rangées de deux (non virtualisée : à poser dans un ScrollView). */

import React from 'react';
import {View} from 'react-native';
import {useTheme} from '@shared/designsystem';
import {chunk} from '../logic/discover';
import type {CommerceProduct} from '../store/commerceTypes';
import {ProductCard} from './ProductCard';

const COLUMNS = 2;

export type ProductGridProps = {
  items: CommerceProduct[];
  onOpenProduct: (product: CommerceProduct) => void;
  /** Les `ranked` premiers portent leur rang (pastille or). */
  ranked?: number;
  testID?: string;
};

export function ProductGrid({items, onOpenProduct, ranked = 0, testID}: ProductGridProps) {
  const {spacing} = useTheme();
  return (
    <View style={{gap: spacing.lg}} testID={testID}>
      {chunk(items, COLUMNS).map((row, r) => (
        <View key={row[0].id} style={{flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.xl}}>
          {row.map((p, c) => {
            const index = r * COLUMNS + c;
            return (
              <ProductCard
                key={p.id}
                product={p}
                onPress={onOpenProduct}
                rank={index < ranked ? index + 1 : undefined}
              />
            );
          })}
          {row.length < COLUMNS ? <View style={{flex: 1}} /> : null}
        </View>
      ))}
    </View>
  );
}
