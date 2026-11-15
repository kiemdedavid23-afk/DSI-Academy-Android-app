/**
 * Paramètres — hub + navigation vers sous-vues (L3d).
 */

import React, {useState, useSyncExternalStore} from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {Text, useTheme, Icon, MemberAvatar} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {memberProfileStore} from '@shared/store';
import {sessionStore} from '@core/session';
import {SettingsAccountView} from '../views/SettingsAccountView';
import {SettingsPreferencesView} from '../views/SettingsPreferencesView';
import {SettingsSecurityView} from '../views/SettingsSecurityView';
import {SettingsHelpView} from '../views/SettingsHelpView';

type Section = 'hub' | 'account' | 'preferences' | 'security' | 'help';

export function MemberSettingsScreen() {
  const {t} = useTranslation();
  const {colors, radii, glass} = useTheme();
  const navigation = useNavigation<any>();
  const [section, setSection] = useState<Section>('hub');

  const profile = useSyncExternalStore(
    cb => memberProfileStore.subscribe(() => cb()),
    () => memberProfileStore.getState(),
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

  if (section === 'account') {
    return <SettingsAccountView onBack={() => setSection('hub')} />;
  }
  if (section === 'preferences') {
    return <SettingsPreferencesView onBack={() => setSection('hub')} />;
  }
  if (section === 'security') {
    return <SettingsSecurityView onBack={() => setSection('hub')} onLogout={onLogout} />;
  }
  if (section === 'help') {
    return <SettingsHelpView onBack={() => setSection('hub')} />;
  }

  const p = profile.data;
  const fullName = p ? `${p.prenom} ${p.nom}`.trim() : '—';

  const rows: {
    id: Section | 'notifications';
    title: string;
    desc: string;
    icon: 'UserIcon' | 'SettingsIcon' | 'BellIcon' | 'ShieldIcon' | 'HelpIcon';
    disabled?: boolean;
  }[] = [
    {
      id: 'account',
      title: t('settings.sections.account', {defaultValue: t('settings.account')}),
      desc: t('settings.accountDesc', {defaultValue: 'Identité et abonnement'}),
      icon: 'UserIcon',
    },
    {
      id: 'preferences',
      title: t('settings.sections.preferences', {defaultValue: t('settings.preferences')}),
      desc: t('settings.preferencesDesc', {defaultValue: 'Langue, thème, animations'}),
      icon: 'SettingsIcon',
    },
    {
      id: 'notifications',
      title: t('settings.sections.notifications', {defaultValue: t('settings.notifications')}),
      desc: t('common.comingSoon'),
      icon: 'BellIcon',
      disabled: true,
    },
    {
      id: 'security',
      title: t('settings.sections.security', {defaultValue: t('settings.security')}),
      desc: t('settings.securityDesc', {defaultValue: 'Session et compte'}),
      icon: 'ShieldIcon',
    },
    {
      id: 'help',
      title: t('settings.sections.help', {defaultValue: t('settings.help')}),
      desc: t('settings.helpDesc', {defaultValue: 'Liens et à propos'}),
      icon: 'HelpIcon',
    },
  ];

  return (
    <ScrollView
      style={{flex: 1, backgroundColor: 'transparent'}}
      contentContainerStyle={{padding: 16, paddingBottom: 32, gap: 20}}
      testID="screen-settings">
      <View
        style={{
          backgroundColor: glass.bg,
          borderColor: glass.border,
          borderWidth: 1,
          borderRadius: radii.lg,
          paddingVertical: 20,
          paddingHorizontal: 24,
        }}>
        <Text style={{fontSize: 21.6, fontWeight: '800', color: colors.textPrimary}}>
          {t('settings.title')}
        </Text>
        <Text style={{fontSize: 13.6, color: colors.textSecondary, marginTop: 4}}>
          {t('settings.subtitle')}
        </Text>
      </View>

      {/* Carte compte */}
      <Pressable
        onPress={() => navigation.navigate('MemberProfile')}
        style={{
          backgroundColor: colors.bgDarkPremium,
          borderColor: colors.goldBorder,
          borderWidth: 1,
          borderRadius: radii.lg,
          paddingVertical: 16,
          paddingHorizontal: 17.6,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14.4,
        }}>
        <MemberAvatar
          initials={`${p?.prenom?.[0] || 'D'}${p?.nom?.[0] || ''}`.toUpperCase()}
          size="md"
        />
        <View style={{flex: 1}}>
          <Text
            style={{
              fontFamily: 'Fraunces-SemiBold',
              fontSize: 17.6,
              color: colors.textOnDark,
            }}>
            {fullName}
          </Text>
          <Text style={{fontSize: 12.8, color: colors.textOnDark, opacity: 0.85}}>
            {p?.identifiantDsi || '—'}
          </Text>
        </View>
        <Icon name="ChevronRightIcon" size={20} color={colors.goldPrestige} />
      </Pressable>

      {/* Catégories */}
      <View
        style={{
          backgroundColor: glass.bg,
          borderColor: glass.border,
          borderWidth: 1,
          borderRadius: radii.lg,
          overflow: 'hidden',
        }}>
        {rows.map((row, idx) => (
          <Pressable
            key={row.id}
            disabled={row.disabled}
            onPress={() => {
              if (row.disabled) return;
              setSection(row.id as Section);
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 13.6,
              paddingVertical: 14.4,
              paddingHorizontal: 17.6,
              minHeight: 44,
              opacity: row.disabled ? 0.55 : 1,
              borderBottomWidth: idx < rows.length - 1 ? StyleSheet.hairlineWidth : 0,
              borderBottomColor: colors.borderLight,
            }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: radii.md,
                backgroundColor: colors.bgSurfaceAlt,
                borderWidth: 1,
                borderColor: colors.borderLight,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Icon name={row.icon as any} size={20} color={colors.textSecondary} />
            </View>
            <View style={{flex: 1, gap: 2.4}}>
              <Text style={{fontSize: 15.2, fontWeight: '600', color: colors.textPrimary}}>
                {row.title}
              </Text>
              <Text style={{fontSize: 12.8, color: colors.textSecondary}}>{row.desc}</Text>
            </View>
            {!row.disabled ? (
              <Icon name="ChevronRightIcon" size={18} color={colors.textMuted} />
            ) : (
              <View
                style={{
                  paddingVertical: 4,
                  paddingHorizontal: 10,
                  borderRadius: 999,
                  backgroundColor: colors.bgSurfaceAlt,
                  borderWidth: 1,
                  borderColor: colors.borderLight,
                }}>
                <Text style={{fontSize: 12.5, fontWeight: '600', color: colors.textMuted}}>
                  {t('common.comingSoon')}
                </Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={onLogout}
        style={{
          paddingVertical: 13.6,
          paddingHorizontal: 16,
          borderRadius: radii.lg,
          backgroundColor: glass.bg,
          borderWidth: 1,
          borderColor: colors.dangerBorder,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          minHeight: 44,
        }}
        testID="settings-logout">
        <Icon name="LogoutIcon" size={20} color={colors.dangerText} />
        <Text style={{color: colors.dangerText, fontSize: 15.2, fontWeight: '700'}}>
          {t('settings.logout')}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
