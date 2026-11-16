/**
 * Mise en avant d'un contenu en grand (site : ContentFeatured) : couverture
 * floutée en fond, couverture au premier plan, titre, auteur et bouton or.
 */

import React from 'react';
import {Image, Pressable, StyleSheet, View} from 'react-native';
import type {Content} from '@core/utils/contentDisplay';
import {contentAuthor} from '@core/utils/contentDisplay';
import {Icon, Scrim, Text, useTheme, withAlpha} from '@shared/designsystem';
import {HOUSE_VISUALS, houseOfType} from '@shared/houses/houseVisuals';
import {ContentCover} from './ContentCover';

const BLUR = 20;

export type ContentFeaturedProps = {
  item: Content;
  eyebrow: string;
  ctaLabel: string;
  onPress: (item: Content) => void;
};

export function ContentFeatured({item, eyebrow, ctaLabel, onPress}: ContentFeaturedProps) {
  const {colors, spacing, radii} = useTheme();
  const houseId = houseOfType(item.type);
  const visual = HOUSE_VISUALS[houseId];
  const author = contentAuthor(item);
  const wide = visual.kind === 'video' || visual.kind === 'course';
  const bg = item.thumbnailUrl ? {uri: item.thumbnailUrl} : visual.image;

  return (
    <Pressable
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={`${eyebrow} : ${item.title}`}
      testID="library-featured"
      style={[
        styles.box,
        {
          backgroundColor: colors.bgDarkPremium,
          borderColor: colors.goldBorder,
          borderRadius: radii.lg,
        },
      ]}>
      <Image source={bg} style={styles.fill} resizeMode="cover" blurRadius={BLUR} />
      <Scrim from={0.35} to={0.8} />
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 18.5, padding: spacing.xl}}>
        <View style={{width: wide ? '46%' : '38%', maxWidth: wide ? 280 : 190}}>
          <ContentCover thumbnailUrl={item.thumbnailUrl} houseId={houseId} />
        </View>
        <View style={{flex: 1, gap: spacing.sm, alignItems: 'flex-start'}}>
          <View
            style={{
              backgroundColor: withAlpha(colors.goldPrestige, 0.14),
              borderColor: colors.goldBorder,
              borderRadius: radii.sm,
              borderWidth: 1,
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xs,
            }}>
            <Text variant="overline" color="gold" style={{fontSize: 11, letterSpacing: 0.95, textTransform: 'uppercase'}}>
              {eyebrow}
            </Text>
          </View>
          <Text variant="heading" color="onDark" numberOfLines={3} style={{lineHeight: 26}}>
            {item.title}
          </Text>
          {author ? (
            <Text variant="bodySmall" color="onDark" style={{opacity: 0.85}} numberOfLines={1}>
              {author}
            </Text>
          ) : null}
          <View
            style={{
              alignItems: 'center',
              backgroundColor: colors.goldPrestige,
              borderRadius: radii.md,
              flexDirection: 'row',
              gap: spacing.sm,
              marginTop: spacing.xs,
              paddingHorizontal: 17.5,
              paddingVertical: spacing.md,
            }}>
            <Text variant="button" style={{color: colors.bgDarkPremium}}>
              {ctaLabel}
            </Text>
            <Icon name="ArrowRightIcon" size={18} color={colors.bgDarkPremium} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {borderWidth: 1, overflow: 'hidden'},
  fill: {position: 'absolute', top: 0, left: 0, right: 0, bottom: 0},
});
