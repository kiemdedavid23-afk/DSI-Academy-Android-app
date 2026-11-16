/**
 * Bandeau d'une maison (site : ContentHouseLayout.jsx + HouseShell.css).
 * Mesuré sur les captures du site (720 px = 360 dp) :
 *  · carte sombre pleine largeur, bordure or, marge intérieure 13,5 dp ;
 *  · illustration carrée en haut (331 dp), puis sélecteur des quatre maisons,
 *    puis icône + « GRANDE MAISON DSI » + titre + accroche ;
 *  · sous la carte : pastilles de sections, collées au bord gauche.
 */
import React, {useCallback, useRef} from 'react';
import {Image, Pressable, ScrollView, View} from 'react-native';
import {Icon, Text, useTheme, withAlpha} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {HOUSE_ORDER, HOUSE_VISUALS, type HouseId} from '@shared/houses/houseVisuals';

const ICON_BOX = 47.5;
const PAD = 13.5;

export type HouseSection = 'discover' | 'explore';

export type HouseBannerProps = {
  houseId: HouseId;
  section: HouseSection;
  onSwitchHouse?: (house: HouseId) => void;
  onSection: (section: HouseSection) => void;
};

export function HouseBanner({houseId, section, onSwitchHouse, onSection}: HouseBannerProps) {
  const {t} = useTranslation();
  const {colors, spacing, radii} = useTheme();
  const visual = HOUSE_VISUALS[houseId];
  const sections: HouseSection[] = ['discover', 'explore'];
  const scroller = useRef<ScrollView>(null);
  const xs = useRef<Partial<Record<HouseId, number>>>({});

  // Le site fait défiler le sélecteur pour montrer la maison précédente à gauche.
  const reveal = useCallback(() => {
    const idx = HOUSE_ORDER.indexOf(houseId);
    const target = HOUSE_ORDER[Math.max(0, Math.min(idx, 2) - 1)];
    const x = xs.current[target];
    if (typeof x === 'number') {
      scroller.current?.scrollTo({x: Math.max(0, x - 5), animated: false});
    }
  }, [houseId]);

  return (
    <View style={{gap: 16.5}}>
      <View
        style={{
          backgroundColor: colors.houseBannerBg,
          borderColor: colors.goldBorder,
          borderRadius: radii.lg,
          borderWidth: 1,
          overflow: 'hidden',
          padding: PAD,
        }}>
        <Image
          source={visual.image}
          style={{aspectRatio: 1, width: '100%'}}
          resizeMode="cover"
          accessible={false}
        />
        <ScrollView
          ref={scroller}
          horizontal
          showsHorizontalScrollIndicator={false}
          onContentSizeChange={reveal}
          style={{
            alignSelf: 'stretch',
            backgroundColor: withAlpha(colors.houseBannerBg, 0.55),
            borderColor: withAlpha(colors.textOnDark, 0.18),
            borderRadius: radii.pill,
            borderWidth: 1,
            flexGrow: 0,
            marginTop: 24.5,
          }}
          contentContainerStyle={{gap: spacing.xs, padding: spacing.xs}}
          accessibilityLabel={t('content.nav.switcherLabel')}>
          {HOUSE_ORDER.map(id => {
            const v = HOUSE_VISUALS[id];
            const active = id === houseId;
            return (
              <Pressable
                key={id}
                onLayout={e => {
                  xs.current[id] = e.nativeEvent.layout.x;
                }}
                onPress={() => (active ? undefined : onSwitchHouse?.(id))}
                accessibilityRole="button"
                accessibilityState={{selected: active}}
                testID={`house-switch-${id}`}
                style={{
                  alignItems: 'center',
                  backgroundColor: active ? withAlpha(colors.goldPrestige, 0.25) : 'transparent',
                  borderColor: active ? withAlpha(colors.goldPrestige, 0.5) : 'transparent',
                  borderRadius: radii.pill,
                  borderWidth: 1,
                  flexDirection: 'row',
                  gap: spacing.sm,
                  opacity: active ? 1 : 0.8,
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                }}>
                <Icon name={v.icon} size={18} color={colors.textOnDark} />
                <Text variant="bodySmallStrong" color="onDark">
                  {t(v.nameKey)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={{alignItems: 'flex-end', flexDirection: 'row', gap: 14, marginTop: 30.5}}>
          <View
            style={{
              alignItems: 'center',
              backgroundColor: withAlpha(colors.houseBannerBg, 0.55),
              borderColor: withAlpha(colors.textOnDark, 0.25),
              borderRadius: radii.md,
              borderWidth: 1,
              height: ICON_BOX,
              justifyContent: 'center',
              width: ICON_BOX,
            }}>
            <Icon name={visual.icon} size={26} color={colors.textOnDark} />
          </View>
          <View style={{flex: 1}}>
            <Text
              variant="overline"
              color="gold"
              style={{letterSpacing: 0.8, textTransform: 'uppercase'}}>
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityLabel={t('content.nav.sectionsLabel')}
        contentContainerStyle={{gap: spacing.sm}}>
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
                backgroundColor: active ? colors.pillActiveBg : colors.bgSurface,
                borderColor: active ? colors.goldBorder : 'transparent',
                borderRadius: radii.pill,
                borderWidth: 1,
                height: 42,
                justifyContent: 'center',
                paddingHorizontal: 18,
              }}>
              <Text variant="bodySmall" color={active ? 'primary' : 'secondary'}>
                {t(`content.nav.${id}`)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
