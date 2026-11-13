/**
 * Écran placeholder : titre i18n uniquement, aucune API.
 */

import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';

type Props = {
  /** Clé i18n du titre (ex. rooms.home). */
  titleKey: string;
  testID?: string;
};

export function PlaceholderScreen({titleKey, testID}: Props) {
  const {t} = useTranslation();
  const {colors, spacing} = useTheme();

  return (
    <View
      testID={testID}
      style={[
        styles.container,
        {backgroundColor: colors.bgApp, padding: spacing.lg},
      ]}>
      <Text variant="title">{t(titleKey)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
});
