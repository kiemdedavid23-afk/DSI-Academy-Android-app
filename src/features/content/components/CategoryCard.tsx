/**
 * Carte de catégorie de l'onglet Explorer : même média que les cartes de
 * livres (image de couverture de la catégorie, sinon illustration de la
 * maison), puis le nom et le nombre de contenus.
 */

import React from 'react';
import {Pressable, View} from 'react-native';
import {Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import type {HouseId} from '@shared/houses/houseVisuals';
import type {CategoryNode} from '@core/utils/contentDisplay';
import {ContentCover} from './ContentCover';

export type CategoryCardProps = {
  category: CategoryNode;
  houseId: HouseId;
  width: number;
  onPress: (id: number) => void;
};

export function CategoryCard({category, houseId, width, onPress}: CategoryCardProps) {
  const {t} = useTranslation();
  const {spacing, touch} = useTheme();
  return (
    <Pressable
      onPress={() => onPress(category.id)}
      accessibilityRole="button"
      accessibilityLabel={category.name}
      testID={`category-card-${category.id}`}
      style={({pressed}) => ({width, minHeight: touch.min, opacity: pressed ? 0.85 : 1})}>
      <ContentCover thumbnailUrl={category.thumbnailUrl} houseId={houseId} />
      <View style={{gap: 2, marginTop: spacing.sm}}>
        <Text variant="cardTitle" numberOfLines={2}>
          {category.name}
        </Text>
        <Text variant="bodySmall" color="muted">
          {t('content.categoryCount', {count: category.totalCount})}
        </Text>
      </View>
    </Pressable>
  );
}
