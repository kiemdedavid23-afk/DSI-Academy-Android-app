/**
 * Hub Académie (site : AcademyScreen.jsx) : héros « reprendre » ou accueil,
 * puis les quatre maisons. Aucune donnée réseau (reprise locale uniquement).
 */

import React, {useEffect, useState} from 'react';
import {Image, Pressable, ScrollView, StyleSheet, View} from 'react-native';
import {Icon, Text, useTheme, withAlpha} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {continueStore, type ContinueEntry} from '@shared/store';
import {
  continueContentId,
  HERO_IMAGE,
  HOUSES,
  HOUSE_ORDER,
  type HouseId,
} from '../logic/houses';

export type AcademyHubScreenProps = {
  onOpenHouse: (house: HouseId) => void;
  onContinue: (contentId: number) => void;
};

export function AcademyHubScreen({onOpenHouse, onContinue}: AcademyHubScreenProps) {
  const {t} = useTranslation();
  const {colors, spacing, radii, touch} = useTheme();
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
  const progress =
    resumeId !== null && typeof entry?.progress === 'number'
      ? Math.max(0, Math.min(100, entry.progress))
      : 0;
  const overlay = withAlpha(colors.bgDarkPremium, 0.7);

  return (
    <ScrollView
      style={{flex: 1, backgroundColor: colors.bgApp}}
      contentContainerStyle={{padding: spacing.xl, gap: spacing.xxl}}
      testID="screen-academy">
      <View
        style={[
          styles.hero,
          {borderColor: colors.goldBorder, borderRadius: radii.lg, backgroundColor: colors.bgDarkPremium},
        ]}>
        <Image source={HERO_IMAGE} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <View style={[StyleSheet.absoluteFill, {backgroundColor: overlay}]} />
        <View style={{padding: spacing.xxl, gap: spacing.sm}}>
          {resumeId !== null && entry ? (
            <>
              <Text variant="overline" color="gold">
                {t('academy.continueEyebrow')}
              </Text>
              <Text variant="heading" color="onDark">
                {entry.title}
              </Text>
              {progress > 0 ? (
                <View
                  accessibilityRole="progressbar"
                  accessibilityValue={{min: 0, max: 100, now: progress}}
                  style={[styles.track, {borderRadius: radii.pill, backgroundColor: withAlpha(colors.textOnDark, 0.2)}]}>
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
                  alignSelf: 'flex-start',
                  minHeight: touch.min,
                  justifyContent: 'center',
                  paddingHorizontal: spacing.xl,
                  borderRadius: radii.md,
                  backgroundColor: colors.goldPrestige,
                }}>
                <Text variant="button" color="primary">
                  {t('academy.continueCta')}
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text variant="overline" color="gold">
                {t('academy.heroEyebrow')}
              </Text>
              <Text variant="heading" color="onDark">
                {t('academy.heroTitle')}
              </Text>
              <Text variant="bodySmall" color="onDark">
                {t('academy.subtitle')}
              </Text>
            </>
          )}
        </View>
      </View>

      <View style={{gap: spacing.md}}>
        <Text variant="subtitle" accessibilityRole="header">
          {t('academy.housesTitle')}
        </Text>
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
                {borderRadius: radii.lg, backgroundColor: colors.bgDarkPremium, opacity: h.available ? 1 : 0.6},
              ]}>
              <Image source={h.image} style={StyleSheet.absoluteFill} resizeMode="cover" />
              <View style={[StyleSheet.absoluteFill, {backgroundColor: overlay}]} />
              <View style={{flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg}}>
                <Icon name={h.icon} size={28} color={colors.goldPrestige} />
                <View style={{flex: 1}}>
                  <Text variant="bodyStrong" color="onDark">
                    {name}
                  </Text>
                  <Text variant="caption" color="onDark">
                    {h.available ? t(h.taglineKey) : t('houses.badgeSoon')}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: {borderWidth: 1, minHeight: 220, justifyContent: 'flex-end', overflow: 'hidden'},
  house: {minHeight: 96, overflow: 'hidden', justifyContent: 'center'},
  track: {height: 6, overflow: 'hidden', width: '70%'},
});
