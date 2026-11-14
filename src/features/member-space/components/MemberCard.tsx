/**
 * Carte membre (site MemberCard) — sans bouton imprimer (Android).
 * Type local (pas d'import core/api dans un composant, R-LAY-6).
 */

import React from 'react';
import {View, StyleSheet} from 'react-native';
import {Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';

export type MemberCardProfile = {
  identifiantDsi: string;
  nom: string;
  prenom: string;
};

export type MemberCardProps = {
  profile: MemberCardProfile;
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
