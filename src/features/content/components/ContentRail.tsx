/** Rangée horizontale de cartes sous un titre de section (site : ContentRail). */

import React from 'react';
import {FlatList, Pressable, View} from 'react-native';
import type {Content} from '@core/utils/contentDisplay';
import {Icon, Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {HOUSE_VISUALS, type HouseId} from '@shared/houses/houseVisuals';
import {isRecent} from '../logic/recent';
import {ContentCard} from './ContentCard';

/** Largeur d'une carte dans la rangée, selon le format (site : --rail-w). */
const RAIL_WIDTH = {book: 140, video: 250, course: 250, audio: 150} as const;

export type ContentRailProps = {
  title: string;
  houseId: HouseId;
  items: Content[];
  categoryName?: (item: Content) => string | null;
  onOpen: (item: Content) => void;
  /** Lien « Voir tout → » à droite du titre (absent = pas de lien). */
  onSeeAll?: () => void;
  testID?: string;
};

export function ContentRail({
  title,
  houseId,
  items,
  categoryName,
  onOpen,
  onSeeAll,
  testID,
}: ContentRailProps) {
  const {t} = useTranslation();
  const {colors, spacing} = useTheme();
  const width = RAIL_WIDTH[HOUSE_VISUALS[houseId].kind];

  return (
    <View style={{gap: spacing.md}} testID={testID}>
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingLeft: 2.5,
          paddingRight: 5,
        }}>
        <Text variant="subtitle" accessibilityRole="header" style={{flexShrink: 1}}>
          {title}
        </Text>
        {onSeeAll ? (
          <Pressable
            onPress={onSeeAll}
            accessibilityRole="button"
            testID={testID ? `${testID}-all` : undefined}
            style={{alignItems: 'center', flexDirection: 'row', gap: spacing.xs}}>
            <Text variant="bodySmall" color="secondary">
              {t('content.seeAll')}
            </Text>
            <Icon name="ArrowRightIcon" size={18} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>
      <FlatList
        horizontal
        data={items}
        keyExtractor={item => String(item.id)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{paddingHorizontal: 0}}
        ItemSeparatorComponent={() => <View style={{width: 13}} />}
        renderItem={({item}) => (
          <View style={{width}}>
            <ContentCard
              item={item}
              categoryName={categoryName?.(item) ?? null}
              badge={
                isRecent(item.createdAt)
                  ? t('content.newBadge')
                  : null
              }
              onPress={onOpen}
            />
          </View>
        )}
      />
    </View>
  );
}
