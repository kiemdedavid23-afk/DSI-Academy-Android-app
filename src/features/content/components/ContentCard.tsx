/** Carte d'un livre dans la grille (site : ContentCard.jsx). */

import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import type {Content} from '@core/utils/contentDisplay';
import {contentAuthor, formatDuration} from '@core/utils/contentDisplay';
import {Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {ContentCover} from './ContentCover';

export type ContentCardProps = {
  item: Content;
  categoryName?: string | null;
  onPress: (item: Content) => void;
};

export function ContentCard({item, categoryName, onPress}: ContentCardProps) {
  const {t} = useTranslation();
  const {spacing, colors, radii, touch} = useTheme();
  const author = contentAuthor(item);
  const duration = formatDuration(item.durationSeconds);

  return (
    <Pressable
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={t('app.catalogue.openItem', {title: item.title})}
      testID={`content-card-${item.id}`}
      style={({pressed}) => [
        styles.card,
        {minHeight: touch.min, opacity: pressed ? 0.85 : 1},
      ]}>
      <ContentCover thumbnailUrl={item.thumbnailUrl} />
      <View style={{gap: spacing.xs, paddingTop: spacing.sm}}>
        <Text variant="bodySmallStrong" numberOfLines={2}>
          {item.title}
        </Text>
        {author ? (
          <Text variant="caption" color="secondary" numberOfLines={1}>
            {author}
          </Text>
        ) : null}
        {categoryName || duration ? (
          <View
            style={[
              styles.chip,
              {
                backgroundColor: colors.bgSurfaceAlt,
                borderRadius: radii.pill,
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
              },
            ]}>
            <Text variant="micro" color="muted" numberOfLines={1}>
              {[categoryName, duration].filter(Boolean).join(' · ')}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {flex: 1},
  chip: {alignSelf: 'flex-start'},
});
