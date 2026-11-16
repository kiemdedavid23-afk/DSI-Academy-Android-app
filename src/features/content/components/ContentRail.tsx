/** Rangée horizontale de cartes sous un titre de section (site : ContentRail). */

import React from 'react';
import {FlatList, View} from 'react-native';
import type {Content} from '@core/utils/contentDisplay';
import {Text, useTheme} from '@shared/designsystem';
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
  testID?: string;
};

export function ContentRail({
  title,
  houseId,
  items,
  categoryName,
  onOpen,
  testID,
}: ContentRailProps) {
  const {t} = useTranslation();
  const {spacing} = useTheme();
  const width = RAIL_WIDTH[HOUSE_VISUALS[houseId].kind];

  return (
    <View style={{gap: spacing.md}} testID={testID}>
      <Text
        variant="subtitle"
        accessibilityRole="header"
        style={{paddingHorizontal: spacing.xl}}>
        {title}
      </Text>
      <FlatList
        horizontal
        data={items}
        keyExtractor={item => String(item.id)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{paddingHorizontal: spacing.xl}}
        ItemSeparatorComponent={() => <View style={{width: spacing.md}} />}
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
