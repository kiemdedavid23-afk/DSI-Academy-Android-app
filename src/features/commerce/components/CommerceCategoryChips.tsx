/** Rangée de catégories (« Toutes » + catégories du Worker, avec le libellé du site). */

import React from 'react';
import {Pressable, ScrollView} from 'react-native';
import {Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {categoryKeys} from '../logic/errorKey';
import type {CommerceCategory, CommerceSource} from '../store/commerceTypes';

export type CommerceCategoryChipsProps = {
  source: CommerceSource;
  categories: CommerceCategory[];
  selected: string | null;
  onSelect: (slug: string | null) => void;
};

export function CommerceCategoryChips({
  source,
  categories,
  selected,
  onSelect,
}: CommerceCategoryChipsProps) {
  const {t} = useTranslation();
  const {colors, spacing, radii, touch} = useTheme();

  const chip = (slug: string | null, label: string) => {
    const active = slug === selected;
    return (
      <Pressable
        key={slug ?? 'all'}
        onPress={() => onSelect(slug)}
        accessibilityRole="button"
        accessibilityState={{selected: active}}
        accessibilityLabel={
          slug === null ? label : t('app.catalogue.filterCategory', {name: label})
        }
        testID={`commerce-chip-${slug ?? 'all'}`}
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
      contentContainerStyle={{gap: 7, paddingHorizontal: spacing.xl}}>
      {chip(null, t('app.catalogue.allCategories'))}
      {categories.map(c =>
        chip(c.slug, t(categoryKeys(source, c.slug), {defaultValue: c.slug})),
      )}
    </ScrollView>
  );
}
