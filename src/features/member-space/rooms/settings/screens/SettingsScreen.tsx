/**
 * Paramètres — bouton « Se déconnecter » provisoire (remplacé par L3d).
 * Aucun import @core/network ni @core/config (R-LAY-5).
 */

import React from 'react';
import {Alert, StyleSheet, View} from 'react-native';
import {Button, Card, Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {sessionStore} from '@core/session';

export function SettingsScreen() {
  const {t} = useTranslation();
  const {colors, spacing} = useTheme();

  const onLogout = () => {
    Alert.alert(t('settings.security.logoutTitle'), t('drawer.logoutConfirm'), [
      {text: t('common.cancel'), style: 'cancel'},
      {
        text: t('settings.security.logoutBtn'),
        style: 'destructive',
        onPress: () => {
          void sessionStore.expireSession('loggedOut');
        },
      },
    ]);
  };

  return (
    <View
      testID="screen-settings"
      style={[styles.fill, {backgroundColor: colors.bgApp, padding: spacing.lg}]}>
      {/* provisoire, remplacé par L3d (paramètres) */}
      <Card>
        <Text variant="title" style={{marginBottom: spacing.sm}}>
          {t('settings.security.logoutTitle')}
        </Text>
        <Text
          variant="body"
          color="secondary"
          style={{marginBottom: spacing.lg}}>
          {t('settings.security.logoutDesc')}
        </Text>
        <Button
          label={t('settings.security.logoutBtn')}
          onPress={onLogout}
          variant="secondary"
          testID="settings-logout"
        />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {flex: 1},
});
