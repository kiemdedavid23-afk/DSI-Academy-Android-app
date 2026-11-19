/**
 * Paramètres — hub sur fond uni + sous-vues. Visuel : SettingsKit.
 */

import React, {useCallback, useState, useSyncExternalStore} from 'react';
import {View, Pressable, Alert, BackHandler} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {Text, useTheme, Icon, MemberAvatar} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {memberProfileStore} from '@shared/store';
import {sessionStore} from '@core/session';
import {APP_VERSION} from '@core/config/appInfo';
import {SettingsAccountView} from '../views/SettingsAccountView';
import {SettingsPreferencesView} from '../views/SettingsPreferencesView';
import {SettingsSecurityView} from '../views/SettingsSecurityView';
import {SettingsHelpView} from '../views/SettingsHelpView';
import {
  SettingsScaffold,
  SettingsGroup,
  SettingsRow,
  SettingsBadge,
} from '../components/SettingsKit';

type Section = 'hub' | 'account' | 'preferences' | 'security' | 'help';

export function MemberSettingsScreen() {
  const {t} = useTranslation();
  const {colors, radii} = useTheme();
  const navigation = useNavigation<any>();
  const [section, setSection] = useState<Section>('hub');

  const profile = useSyncExternalStore(
    cb => memberProfileStore.subscribe(() => cb()),
    () => memberProfileStore.getState(),
  );

  // Le retour Android ferme d'abord la sous-page, puis quitte les Paramètres.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (section !== 'hub') {
          setSection('hub');
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, [section]),
  );

  const onLogout = () => {
    Alert.alert(t('settings.security.logoutTitle'), t('drawer.logoutConfirm'), [
      {text: t('common.cancel'), style: 'cancel'},
      {
        text: t('settings.logout'),
        style: 'destructive',
        onPress: () => {
          void sessionStore.expireSession('loggedOut');
        },
      },
    ]);
  };

  const toHub = () => setSection('hub');

  if (section === 'account') {
    return <SettingsAccountView onBack={toHub} />;
  }
  if (section === 'preferences') {
    return <SettingsPreferencesView onBack={toHub} />;
  }
  if (section === 'security') {
    return <SettingsSecurityView onBack={toHub} onLogout={onLogout} />;
  }
  if (section === 'help') {
    return <SettingsHelpView onBack={toHub} />;
  }

  const p = profile.data;
  const fullName = p ? `${p.prenom} ${p.nom}`.trim() : '—';

  const leave = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('MemberHome');
    }
  };

  return (
    <SettingsScaffold
      title={t('settings.title')}
      onBack={leave}
      onInfo={() => setSection('help')}
      backLabel={t('settings.back')}
      infoLabel={t('settings.sections.help.title')}
      testID="screen-settings">
      {/* Carte membre */}
      <Pressable
        onPress={() => navigation.navigate('MemberProfile')}
        accessibilityRole="button"
        style={{
          backgroundColor: colors.bgSurface,
          borderColor: colors.borderLight,
          borderWidth: 1,
          borderRadius: radii.lg + 6,
          paddingVertical: 16,
          paddingHorizontal: 18,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
        }}>
        <MemberAvatar
          initials={`${p?.prenom?.[0] || 'D'}${p?.nom?.[0] || ''}`.toUpperCase()}
          size="md"
        />
        <View style={{flex: 1, gap: 2}}>
          <Text style={{fontSize: 18, fontWeight: '700', color: colors.textPrimary}}>
            {fullName}
          </Text>
          <Text style={{fontSize: 14, color: colors.textSecondary}}>
            {p?.identifiantDsi || '—'}
          </Text>
        </View>
        <Icon name="ChevronRightIcon" size={20} color={colors.textMuted} />
      </Pressable>

      <SettingsGroup>
        <SettingsRow
          icon="UserIcon"
          title={t('settings.sections.account.title')}
          onPress={() => setSection('account')}
          chevron
          testID="settings-row-account"
        />
        <SettingsRow
          icon="SettingsIcon"
          title={t('settings.sections.preferences.title')}
          onPress={() => setSection('preferences')}
          chevron
          testID="settings-row-preferences"
        />
        <SettingsRow
          icon="BellIcon"
          title={t('settings.sections.notifications.title')}
          disabled
          right={<SettingsBadge text={t('common.comingSoon')} />}
        />
        <SettingsRow
          icon="ShieldIcon"
          title={t('settings.sections.security.title')}
          onPress={() => setSection('security')}
          chevron
          testID="settings-row-security"
        />
      </SettingsGroup>

      <SettingsGroup>
        <SettingsRow
          icon="HelpIcon"
          title={t('settings.sections.help.title')}
          onPress={() => setSection('help')}
          chevron
          testID="settings-row-help"
        />
      </SettingsGroup>

      <SettingsGroup>
        <SettingsRow
          icon="LogoutIcon"
          title={t('settings.logout')}
          onPress={onLogout}
          danger
          testID="settings-logout"
        />
      </SettingsGroup>

      <Text style={{textAlign: 'center', fontSize: 13, color: colors.textMuted}}>
        DSI Academy · v{APP_VERSION}
      </Text>
    </SettingsScaffold>
  );
}
