/** Rangée de catégories (« Toutes » + catégories actives du Worker). */

import React from 'react';
import {Pressable, ScrollView} from 'react-native';
import type {Category} from '@core/utils/contentDisplay';
import {Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';

export type CategoryChipsProps = {
  categories: Category[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
};

export function CategoryChips({
  categories,
  selectedId,
  onSelect,
}: CategoryChipsProps) {
  const {t} = useTranslation();
  const {colors, spacing, radii, touch} = useTheme();

  const chip = (id: number | null, label: string, a11y: string) => {
    const active = id === selectedId;
    return (
      <Pressable
        key={id ?? 'all'}
        onPress={() => onSelect(id)}
        accessibilityRole="button"
        accessibilityState={{selected: active}}
        accessibilityLabel={a11y}
        testID={`category-chip-${id ?? 'all'}`}
        style={{
          minHeight: touch.min,
          justifyContent: 'center',
          paddingHorizontal: spacing.lg,
          borderRadius: radii.pill,
          borderWidth: 1,
          borderColor: active ? colors.goldBorder : colors.borderLight,
          backgroundColor: active ? colors.goldLight : colors.bgSurface,
        }}>
        <Text variant="bodySmallStrong" color={active ? 'gold' : 'secondary'}>
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{gap: 7, paddingHorizontal: 1.5}}>
      {chip(null, t('app.catalogue.allCategories'), t('app.catalogue.allCategories'))}
      {categories.map(c =>
        chip(c.id, c.name, t('app.catalogue.filterCategory', {name: c.name})),
      )}
    </ScrollView>
  );
}
