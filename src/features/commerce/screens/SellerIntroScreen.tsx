/**
 * Vendeur, écran d'entrée (Marketplace seulement) : présentation, « Comment ça marche »
 * en 3 étapes, « Ce qu'il vous faut », conditions d'utilisation, bouton de candidature.
 * L'assistant de candidature appartient à l'espace vendeur (document suivant) : tant
 * qu'il n'est pas branché (`onStart` absent), le bouton annonce son ouverture.
 */

import React, {useState} from 'react';
import {Pressable, ScrollView, View} from 'react-native';
import {Button, Icon, Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';

const STEPS = ['step1', 'step2', 'step3'] as const;
const NEEDS = ['need1', 'need2', 'need3'] as const;

export type SellerIntroScreenProps = {
  /** Coque : carte d'ambiance et sélecteurs, posés en tête. */
  shellHeader: React.ReactNode;
  /** Ouvre la candidature ; absent tant que l'espace vendeur n'existe pas. */
  onStart?: () => void;
};

export function SellerIntroScreen({shellHeader, onStart}: SellerIntroScreenProps) {
  const {t} = useTranslation();
  const {colors, spacing, radii} = useTheme();
  const [accepted, setAccepted] = useState(false);
  const [soon, setSoon] = useState(false);

  const start = () => {
    if (onStart) {
      onStart();
    } else {
      setSoon(true);
    }
  };

  return (
    <ScrollView
      style={{flex: 1, backgroundColor: colors.bgApp}}
      contentContainerStyle={{gap: spacing.xl, paddingBottom: spacing.xxxl}}
      testID="screen-marketplace-seller">
      {shellHeader}
      <View style={{gap: spacing.sm, paddingHorizontal: spacing.xl}}>
        <Text variant="title" accessibilityRole="header">
          {t('commerce.shell.seller.title')}
        </Text>
        <Text variant="body" color="secondary">
          {t('commerce.shell.seller.body')}
        </Text>
      </View>

      <View style={{gap: spacing.md, paddingHorizontal: spacing.xl}}>
        <Text variant="subtitle" accessibilityRole="header">
          {t('commerce.shell.seller.howTitle')}
        </Text>
        {STEPS.map((key, i) => (
          <View key={key} style={{alignItems: 'center', flexDirection: 'row', gap: spacing.md}}>
            <View
              style={{
                alignItems: 'center',
                backgroundColor: colors.goldLight,
                borderColor: colors.goldBorder,
                borderRadius: radii.pill,
                borderWidth: 1,
                height: 32,
                justifyContent: 'center',
                width: 32,
              }}>
              <Text variant="bodySmallStrong" color="gold">
                {i + 1}
              </Text>
            </View>
            <Text variant="body" style={{flex: 1}} testID={`seller-step-${i + 1}`}>
              {t(`commerce.shell.seller.${key}`)}
            </Text>
          </View>
        ))}
      </View>

      <View style={{gap: spacing.sm, paddingHorizontal: spacing.xl}}>
        <Text variant="subtitle" accessibilityRole="header">
          {t('commerce.shell.seller.needTitle')}
        </Text>
        {NEEDS.map(key => (
          <View key={key} style={{alignItems: 'center', flexDirection: 'row', gap: spacing.sm}}>
            <Icon name="CheckIcon" size={20} color={colors.goldPrestige} />
            <Text variant="body" style={{flex: 1}}>
              {t(`commerce.shell.seller.${key}`)}
            </Text>
          </View>
        ))}
      </View>

      <View style={{gap: spacing.md, paddingHorizontal: spacing.xl}}>
        <Pressable
          onPress={() => setAccepted(v => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{checked: accepted}}
          testID="seller-terms"
          style={{alignItems: 'center', flexDirection: 'row', gap: spacing.md, minHeight: 44}}>
          <View
            style={{
              alignItems: 'center',
              backgroundColor: accepted ? colors.goldPrestige : 'transparent',
              borderColor: accepted ? colors.goldPrestige : colors.borderLight,
              borderRadius: 6,
              borderWidth: 1,
              height: 24,
              justifyContent: 'center',
              width: 24,
            }}>
            {accepted ? <Icon name="CheckIcon" size={16} color={colors.bgApp} /> : null}
          </View>
          <Text variant="bodySmall" style={{flex: 1}}>
            {t('commerce.shell.seller.terms')}
          </Text>
        </Pressable>
        <Button
          label={t('commerce.shell.seller.start')}
          onPress={start}
          disabled={!accepted}
          testID="seller-start"
        />
        {soon ? (
          <Text variant="caption" color="secondary" testID="seller-start-soon">
            {t('commerce.shell.seller.startSoon')}
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}
