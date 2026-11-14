/**
 * Carte membre (site MemberCard) — sans bouton imprimer (Android).
 * Utilisée dans la pièce Profil (étape ultérieure), pas sur l'accueil.
 */

import React from 'react';
import {View, StyleSheet} from 'react-native';
import {Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import type {MemberProfile} from '@core/api/endpoints/payment/membre.types';

export type MemberCardProps = {
  profile: MemberProfile;
  subscriptionActive: boolean;
};

export function MemberCard({profile, subscriptionActive}: MemberCardProps) {
  const {t} = useTranslation();
  const {colors, spacing, radii} = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.bgSurface,
          borderRadius: radii.lg,
          padding: spacing.lg,
          borderColor: colors.goldBorder,
        },
      ]}
      testID="member-card">
      <Text variant="caption" color="gold">
        {t('premium.memberCardChip')}
      </Text>
      <Text variant="title" color="primary" style={{marginTop: spacing.sm}}>
        {`${profile.prenom} ${profile.nom}`.trim()}
      </Text>
      <Text variant="body" color="secondary">
        {profile.identifiantDsi}
      </Text>
      <Text variant="caption" color="secondary" style={{marginTop: spacing.sm}}>
        {t('profile.memberLevel')}
      </Text>
      <Text variant="label" color="primary">
        {subscriptionActive
          ? t('premium.subscriptionActive')
          : t('premium.subscriptionInactive')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {borderWidth: StyleSheet.hairlineWidth},
});
