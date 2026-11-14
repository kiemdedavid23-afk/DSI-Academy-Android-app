/**
 * Écran « Bientôt disponible » — aucune donnée fictive.
 */

import React from 'react';
import {View, StyleSheet} from 'react-native';
import {Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';

export type PlaceholderScreenProps = {
  /** Clé i18n du titre (ex. rooms.subscription). */
  titleKey?: string;
  testID?: string;
};

export function PlaceholderScreen({titleKey, testID}: PlaceholderScreenProps) {
  const {t} = useTranslation();
  const {colors, spacing} = useTheme();
  return (
    <View
      testID={testID ?? 'screen-placeholder'}
      style={[
        styles.fill,
        {
          backgroundColor: colors.bgApp,
          padding: spacing.xl,
        },
      ]}>
      {titleKey ? (
        <Text variant="title" color="primary" style={{marginBottom: spacing.md}}>
          {t(titleKey)}
        </Text>
      ) : null}
      <Text variant="body" color="secondary">
        {t('common.comingSoon')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {flex: 1, justifyContent: 'center'},
});
