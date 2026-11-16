/**
 * Bandeau d'une maison (site : ContentHouseLayout.jsx + HouseShell.css) :
 * illustration, sélecteur des quatre maisons, icône, titre et accroche,
 * puis les pastilles de sections.
 */

import React from 'react';
import {Image, Pressable, ScrollView, StyleSheet, View} from 'react-native';
import {Icon, Scrim, Text, useTheme, withAlpha} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {HOUSE_ORDER, HOUSE_VISUALS, type HouseId} from '@shared/houses/houseVisuals';

const ICON_BOX = 48;

export type HouseSection = 'discover' | 'explore';

export type HouseBannerProps = {
  houseId: HouseId;
  section: HouseSection;
  onSwitchHouse?: (house: HouseId) => void;
  onSection: (section: HouseSection) => void;
};

export function HouseBanner({houseId, section, onSwitchHouse, onSection}: HouseBannerProps) {
  const {t} = useTranslation();
  const {colors, spacing, radii, glass} = useTheme();
  const visual = HOUSE_VISUALS[houseId];
  const sections: HouseSection[] = ['discover', 'explore'];

  return (
    <View style={{gap: spacing.md}}>
      <View
        style={[
          styles.banner,
          {
            backgroundColor: colors.bgDarkPremium,
            borderColor: colors.goldBorder,
            borderRadius: radii.lg,
            gap: spacing.xxl,
            padding: spacing.md,
          },
        ]}>
        <Image source={visual.image} style={styles.fill} resizeMode="cover" />
        <Scrim from={0.35} to={0.9} />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[
            styles.switcher,
            {
              backgroundColor: withAlpha(colors.bgDarkPremium, 0.55),
              borderColor: withAlpha(colors.textOnDark, 0.18),
              borderRadius: radii.pill,
            },
          ]}
          contentContainerStyle={{gap: spacing.xs, padding: spacing.xs}}
          accessibilityLabel={t('content.nav.switcherLabel')}>
          {HOUSE_ORDER.map(id => {
            const v = HOUSE_VISUALS[id];
            const active = id === houseId;
            return (
              <Pressable
                key={id}
                onPress={() => (active ? undefined : onSwitchHouse?.(id))}
                accessibilityRole="button"
                accessibilityState={{selected: active}}
                testID={`house-switch-${id}`}
                style={{
                  alignItems: 'center',
                  backgroundColor: active ? withAlpha(colors.goldPrestige, 0.25) : 'transparent',
                  borderColor: active ? colors.goldBorder : 'transparent',
                  borderRadius: radii.pill,
                  borderWidth: 1,
                  flexDirection: 'row',
                  gap: spacing.sm,
                  opacity: active ? 1 : 0.8,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                }}>
                <Icon name={v.icon} size={18} color={colors.textOnDark} />
                <Text variant="bodySmallStrong" color="onDark">
                  {t(v.nameKey)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={{alignItems: 'flex-end', flexDirection: 'row', gap: spacing.md}}>
          <View
            style={[
              styles.iconBox,
              {
                backgroundColor: withAlpha(colors.bgDarkPremium, 0.55),
                borderColor: withAlpha(colors.textOnDark, 0.25),
                borderRadius: radii.md,
              },
            ]}>
            <Icon name={visual.icon} size={26} color={colors.textOnDark} />
          </View>
          <View style={{flex: 1}}>
            <Text variant="overline" color="gold" style={{textTransform: 'uppercase'}}>
              {t('houses.eyebrow')}
            </Text>
            <Text variant="title" color="onDark" accessibilityRole="header">
              {t(visual.nameKey)}
            </Text>
            <Text variant="bodySmall" color="onDark" style={{opacity: 0.85}}>
              {t(visual.taglineKey)}
            </Text>
          </View>
        </View>
      </View>

      <View
        accessibilityLabel={t('content.nav.sectionsLabel')}
        style={{flexDirection: 'row', gap: spacing.sm}}>
        {sections.map(id => {
          const active = id === section;
          return (
            <Pressable
              key={id}
              onPress={() => onSection(id)}
              accessibilityRole="button"
              accessibilityState={{selected: active}}
              testID={`house-section-${id}`}
              style={{
                alignItems: 'center',
                backgroundColor: active ? withAlpha(colors.goldPrestige, 0.18) : glass.bg,
                borderColor: active ? colors.goldBorder : glass.border,
                borderRadius: radii.pill,
                borderWidth: 1,
                flex: 1,
                justifyContent: 'center',
                minHeight: 44,
                paddingHorizontal: spacing.lg,
              }}>
              <Text variant="bodySmallStrong" color={active ? 'primary' : 'secondary'}>
                {t(`content.nav.${id}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {borderWidth: 1, justifyContent: 'space-between', minHeight: 200, overflow: 'hidden'},
  fill: {...StyleSheet.absoluteFillObject},
  iconBox: {
    alignItems: 'center',
    borderWidth: 1,
    height: ICON_BOX,
    justifyContent: 'center',
    width: ICON_BOX,
  },
  switcher: {alignSelf: 'flex-start', borderWidth: 1, maxWidth: '100%'},
});
