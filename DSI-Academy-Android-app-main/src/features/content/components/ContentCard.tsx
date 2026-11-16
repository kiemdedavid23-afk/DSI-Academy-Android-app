/**
 * Carte de contenu (site : ContentCard.jsx), un format par type :
 * livre 2:3 · vidéo et formation 16:9 · audio carré.
 * Pastilles sur le média : « Nouveau » (or), durée ou niveau, bouton de lecture.
 */

import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import type {Content} from '@core/utils/contentDisplay';
import {contentAuthor, formatDuration, levelKey} from '@core/utils/contentDisplay';
import {Icon, Text, useTheme, withAlpha} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {HOUSE_VISUALS, houseOfType} from '@shared/houses/houseVisuals';
import {ContentCover} from './ContentCover';

const PLAY_SIZE = 34;

export type ContentCardProps = {
  item: Content;
  categoryName?: string | null;
  /** Texte de la pastille or (ex. « Nouveau »). */
  badge?: string | null;
  onPress: (item: Content) => void;
};

export function ContentCard({item, categoryName, badge, onPress}: ContentCardProps) {
  const {t} = useTranslation();
  const {spacing, colors, radii, touch} = useTheme();
  const author = contentAuthor(item);
  const houseId = houseOfType(item.type);
  const playable = HOUSE_VISUALS[houseId].kind !== 'book';
  const lk = levelKey(item.level);
  const chip = formatDuration(item.durationSeconds) ?? (lk ? t(`houses.filters.${lk}`) : null);
  const dark = withAlpha(colors.bgDarkPremium, 0.72);

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
      <ContentCover thumbnailUrl={item.thumbnailUrl} houseId={houseId}>
        {badge ? (
          <View
            style={[
              styles.pill,
              styles.topLeft,
              {
                backgroundColor: colors.goldPrestige,
                borderRadius: radii.pill,
                left: spacing.sm,
                top: spacing.sm,
                paddingHorizontal: spacing.sm,
              },
            ]}>
            <Text variant="micro" style={{color: colors.bgDarkPremium}}>
              {badge}
            </Text>
          </View>
        ) : null}
        {chip ? (
          <View
            style={[
              styles.pill,
              {
                backgroundColor: dark,
                borderColor: withAlpha(colors.textOnDark, 0.2),
                borderRadius: radii.pill,
                borderWidth: 1,
                bottom: spacing.sm,
                left: spacing.sm,
                paddingHorizontal: spacing.sm,
              },
            ]}>
            <Text variant="micro" color="onDark">
              {chip}
            </Text>
          </View>
        ) : null}
        {playable ? (
          <View
            style={[
              styles.play,
              {
                backgroundColor: dark,
                borderColor: withAlpha(colors.textOnDark, 0.3),
                bottom: spacing.sm,
                right: spacing.sm,
              },
            ]}>
            <Icon name="PlayIcon" size={18} color={colors.textOnDark} />
          </View>
        ) : null}
      </ContentCover>
      <View style={{gap: spacing.xs, paddingTop: spacing.sm}}>
        <Text variant="cardTitle" numberOfLines={2}>
          {item.title}
        </Text>
        {author ? (
          <Text variant="caption" color="secondary" numberOfLines={1}>
            {author}
          </Text>
        ) : null}
        {categoryName ? (
          <View
            style={[
              styles.cat,
              {
                backgroundColor: colors.bgSurfaceAlt,
                borderColor: colors.borderLight,
                borderRadius: radii.pill,
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
              },
            ]}>
            <Text variant="micro" color="secondary" numberOfLines={1}>
              {categoryName}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {flex: 1},
  cat: {alignSelf: 'flex-start', borderWidth: 1},
  pill: {alignItems: 'center', justifyContent: 'center', paddingVertical: 3, position: 'absolute'},
  topLeft: {},
  play: {
    alignItems: 'center',
    borderRadius: 9999,
    borderWidth: 1,
    height: PLAY_SIZE,
    justifyContent: 'center',
    position: 'absolute',
    width: PLAY_SIZE,
  },
});
