/**
 * Hub Académie (site : AcademyScreen.jsx + AcademyScreen.css) : héros « reprendre »
 * ou accueil (deux éventails mélangeant les couvertures des quatre maisons, puis
 * le texte), puis les quatre maisons en cartes illustrées (2 colonnes).
 * Données réseau : seulement les couvertures de l'éventail (4 requêtes, cache 24 h).
 */

import React, {useEffect, useState} from 'react';
import {Image, Pressable, ScrollView, StyleSheet, View} from 'react-native';
import {Icon, Scrim, Text, useTheme, withAlpha} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {continueStore, type ContinueEntry} from '@shared/store';
import {HOUSE_VISUALS, type HouseId} from '@shared/houses/houseVisuals';
import {MixedCoverFans} from '../../content/components/CoverFans';
import {continueContentId, HOUSES, HOUSE_ORDER} from '../logic/houses';

const CHIP = 40;

export type AcademyHubScreenProps = {
  onOpenHouse: (house: HouseId) => void;
  onContinue: (contentId: number) => void;
};

export function AcademyHubScreen({onOpenHouse, onContinue}: AcademyHubScreenProps) {
  const {t} = useTranslation();
  const {colors, spacing, radii, touch, glass} = useTheme();
  const [entry, setEntry] = useState<ContinueEntry | null>(null);

  useEffect(() => {
    let alive = true;
    void continueStore.get().then(e => {
      if (alive) {
        setEntry(e);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const resumeId = continueContentId(entry);
  const entryVisual =
    resumeId !== null && entry && entry.house in HOUSE_VISUALS
      ? HOUSE_VISUALS[entry.house as HouseId]
      : null;
  const progress =
    resumeId !== null && typeof entry?.progress === 'number'
      ? Math.max(0, Math.min(100, entry.progress))
      : 0;
  const dark = withAlpha(colors.bgDarkPremium, 0.55);

  return (
    <ScrollView
      style={{flex: 1, backgroundColor: colors.bgApp}}
      contentContainerStyle={{
        gap: spacing.xxl,
        paddingBottom: spacing.xl,
        paddingHorizontal: spacing.xl,
        paddingTop: 24.5,
      }}
      testID="screen-academy">
      <View
        style={[
          styles.hero,
          {borderRadius: radii.lg},
        ]}>
        <View>
          <MixedCoverFans />
        </View>
        <View style={{padding: spacing.xxl, gap: spacing.sm, alignItems: 'flex-start'}}>
          <View
            style={{
              backgroundColor: withAlpha(colors.goldPrestige, 0.14),
              borderColor: colors.goldBorder,
              borderRadius: radii.sm,
              borderWidth: 1,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs,
            }}>
            <Text
              variant="captionStrong"
              color="gold"
              style={{letterSpacing: 0.6, textTransform: 'uppercase'}}>
              {resumeId !== null ? t('academy.continueEyebrow') : t('academy.heroEyebrow')}
            </Text>
          </View>
          {resumeId !== null && entry ? (
            <>
              <Text
                variant="title"
                color="primary"
                accessibilityRole="header"
                style={{lineHeight: 31}}>
                {entry.title}
              </Text>
              {entryVisual ? (
                <Text variant="bodySmall" color="primary" >
                  {t(entryVisual.nameKey)}
                </Text>
              ) : null}
              {progress > 0 ? (
                <View
                  accessibilityRole="progressbar"
                  accessibilityValue={{min: 0, max: 100, now: progress}}
                  style={[
                    styles.track,
                    {borderRadius: radii.pill, backgroundColor: withAlpha(colors.textPrimary, 0.12)},
                  ]}>
                  <View
                    style={{
                      width: `${progress}%`,
                      height: '100%',
                      backgroundColor: colors.goldPrestige,
                    }}
                  />
                </View>
              ) : null}
              <Pressable
                onPress={() => onContinue(resumeId)}
                accessibilityRole="button"
                testID="academy-continue"
                style={{
                  alignItems: 'center',
                  backgroundColor: colors.goldPrestige,
                  borderRadius: radii.md,
                  flexDirection: 'row',
                  gap: spacing.sm,
                  marginTop: spacing.xs,
                  minHeight: touch.min,
                  paddingHorizontal: spacing.xl,
                }}>
                <Text variant="button" style={{color: colors.bgDarkPremium, fontSize: 15}}>
                  {t('academy.continueCta')}
                </Text>
                <Icon name="ArrowRightIcon" size={18} color={colors.bgDarkPremium} />
              </Pressable>
            </>
          ) : (
            <>
              <Text
                variant="title"
                color="primary"
                accessibilityRole="header"
                style={{lineHeight: 31}}>
                {t('academy.heroTitle')}
              </Text>
              <Text variant="bodySmall" color="primary" >
                {t('academy.subtitle')}
              </Text>
            </>
          )}
        </View>
      </View>

      <View>
        <Text
          variant="captionStrong"
          color="secondary"
          accessibilityRole="header"
          style={{
            letterSpacing: 0.6,
            marginBottom: 13,
            marginHorizontal: spacing.xs,
            textTransform: 'uppercase',
          }}>
          {t('academy.housesTitle')}
        </Text>
        <View style={styles.grid}>
          {HOUSE_ORDER.map(id => {
            const h = HOUSES[id];
            const name = t(h.nameKey);
            return (
              <Pressable
                key={id}
                disabled={!h.available}
                onPress={() => onOpenHouse(id)}
                accessibilityRole="button"
                accessibilityState={{disabled: !h.available}}
                accessibilityLabel={
                  h.available
                    ? t('app.catalogue.openHouse', {name})
                    : t('app.catalogue.comingSoonHouse', {name})
                }
                testID={`house-${id}`}
                style={[
                  styles.house,
                  {
                    backgroundColor: colors.bgDarkPremium,
                    borderColor: glass.border,
                    borderRadius: radii.lg,
                    marginBottom: 14.5,
                    opacity: h.available ? 1 : 0.6,
                    padding: spacing.lg,
                  },
                ]}>
                <Image source={h.image} style={styles.fill} resizeMode="cover" />
                <Scrim from={0.05} to={0.92} />
                <View
                  style={[
                    styles.chip,
                    {
                      backgroundColor: dark,
                      borderColor: withAlpha(colors.textOnDark, 0.25),
                      left: 14,
                      top: 15,
                    },
                  ]}>
                  <Icon name={h.icon} size={22} color={colors.textOnDark} />
                </View>
                <View style={{gap: spacing.xs}}>
                  <Text variant="subtitle" color="onDark">
                    {name}
                  </Text>
                  <Text variant="caption" color="onDark" style={{fontSize: 13, opacity: 0.85}}>
                    {h.available ? t(h.taglineKey) : t('houses.badgeSoon')}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    borderRadius: 9999,
    borderWidth: 1,
    height: CHIP,
    justifyContent: 'center',
    position: 'absolute',
    width: CHIP,
  },
  fill: {position: 'absolute', top: 0, left: 0, right: 0, bottom: 0},
  grid: {flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between'},
  hero: {overflow: 'hidden'},
  house: {borderWidth: 1, justifyContent: 'flex-end', minHeight: 189, overflow: 'hidden', width: '47.65625%'},
  track: {height: 6, maxWidth: 320, overflow: 'hidden', width: '100%'},
});
