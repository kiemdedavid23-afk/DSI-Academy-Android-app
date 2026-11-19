/**
 * Carte d'ambiance en tête de chaque section (Marketplace et Boutique) :
 * image sombre, étiquette dorée, titre, phrase, pastille loupe décorative.
 */

import React from 'react';
import {ImageBackground, View} from 'react-native';
import {Icon, Scrim, Text, useTheme, withAlpha} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {artForIndex} from '../logic/art';
import {HERO_ART_INDEX, type CommerceSection} from '../logic/commerceSections';
import type {CommerceSource} from '../store/commerceTypes';

const HEIGHT = 200;
const BADGE = 40;

export type CommerceHeroProps = {
  source: CommerceSource;
  section: CommerceSection;
};

export function CommerceHero({source, section}: CommerceHeroProps) {
  const {t} = useTranslation();
  const {colors, radii, spacing} = useTheme();
  const base = `commerce.shell.hero.${source}.${section}`;

  return (
    <ImageBackground
      source={artForIndex(HERO_ART_INDEX[section])}
      resizeMode="cover"
      style={{
        backgroundColor: colors.bgDarkPremium,
        borderColor: colors.goldBorder,
        borderRadius: radii.lg,
        borderWidth: 1,
        height: HEIGHT,
        marginHorizontal: spacing.xl,
        overflow: 'hidden',
      }}
      testID="commerce-hero">
      <Scrim from={0.1} to={0.85} />
      <View style={{flex: 1, justifyContent: 'space-between', padding: spacing.lg}}>
        <Text
          variant="overline"
          color="gold"
          style={{fontSize: 11, letterSpacing: 0.95, textTransform: 'uppercase'}}>
          {t(`commerce.shell.eyebrow.${source}`)}
        </Text>
        <View style={{gap: spacing.xs}}>
          <Text variant="title" color="onDark" accessibilityRole="header">
            {t(`${base}.title`)}
          </Text>
          <Text variant="bodySmall" color="onDark" style={{opacity: 0.9}}>
            {t(`${base}.body`)}
          </Text>
        </View>
      </View>
      <View
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={{
          alignItems: 'center',
          backgroundColor: withAlpha(colors.bgDarkPremium, 0.55),
          borderColor: withAlpha(colors.textOnDark, 0.3),
          borderRadius: BADGE / 2,
          borderWidth: 1,
          height: BADGE,
          justifyContent: 'center',
          position: 'absolute',
          right: spacing.lg,
          top: spacing.lg,
          width: BADGE,
        }}>
        <Icon name="SearchIcon" size={20} color={colors.textOnDark} />
      </View>
    </ImageBackground>
  );
}
