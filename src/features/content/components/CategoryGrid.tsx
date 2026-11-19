/**
 * Grille verticale de cartes de catégorie (2 colonnes, 1 pour les maisons à
 * format large). On circule en faisant défiler la page, comme pour les livres.
 */

import React from 'react';
import {View, useWindowDimensions} from 'react-native';
import {useTheme} from '@shared/designsystem';
import type {HouseId} from '@shared/houses/houseVisuals';
import type {CategoryNode} from '@core/utils/contentDisplay';
import {CategoryCard} from './CategoryCard';

export type CategoryGridProps = {
  categories: CategoryNode[];
  houseId: HouseId;
  columns: number;
  onSelect: (id: number) => void;
};

export function CategoryGrid({categories, houseId, columns, onSelect}: CategoryGridProps) {
  const {spacing} = useTheme();
  const {width} = useWindowDimensions();
  const inner = width - spacing.xl * 2;
  const cell = Math.floor((inner - spacing.md * (columns - 1)) / columns);
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.lg,
        columnGap: spacing.md,
        paddingHorizontal: spacing.xl,
      }}
      testID="category-grid">
      {categories.map(c => (
        <CategoryCard key={c.id} category={c} houseId={houseId} width={cell} onPress={onSelect} />
      ))}
    </View>
  );
}
