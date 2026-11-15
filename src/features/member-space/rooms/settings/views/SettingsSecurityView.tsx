import React, {useSyncExternalStore} from 'react';
import {View, ScrollView, Pressable} from 'react-native';
import {Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {memberProfileStore, memberSubscriptionStore} from '@shared/store';
import {sessionStore} from '@core/session';

export function SettingsSecurityView({
  onBack,
  onLogout,
}: {
  onBack: () => void;
  onLogout: () => void;
}) {
  const {t} = useTranslation();
  const {colors, radii, glass} = useTheme();
  const sessionActive = useSyncExternalStore(
    sessionStore.subscribe,
    () => sessionStore.hasSession(),
    () => false,
  );
  const profile = useSyncExternalStore(
    cb => memberProfileStore.subscribe(() => cb()),
    () => memberProfileStore.getState(),
  );
  const sub = useSyncExternalStore(
    cb => memberSubscriptionStore.subscribe(() => cb()),
    () => memberSubscriptionStore.getState(),
  );

  const active = sessionActive;

  return (
    <ScrollView contentContainerStyle={{padding: 16, gap: 16}}>
      <Pressable
        onPress={onBack}
        style={{
          alignSelf: 'flex-start',
          padding: 10,
          borderRadius: radii.md,
          backgroundColor: glass.bg,
          borderWidth: 1,
          borderColor: glass.border,
        }}>
        <Text style={{fontWeight: '600'}}>← {t('settings.back')}</Text>
      </Pressable>
      <Text style={{fontSize: 19.2, fontWeight: '800'}}>{t('settings.security')}</Text>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}>
        <View
          style={{
            paddingVertical: 4,
            paddingHorizontal: 10,
            borderRadius: 999,
            backgroundColor: active ? 'rgba(34,197,94,0.14)' : colors.bgSurfaceAlt,
            borderWidth: 1,
            borderColor: active ? 'rgba(34,197,94,0.3)' : colors.borderLight,
          }}>
          <Text
            style={{
              fontSize: 12.5,
              fontWeight: '600',
              color: active ? '#15803D' : colors.textSecondary,
            }}>
            {active
              ? t('settings.sessionActive', {defaultValue: 'Session active'})
              : t('settings.sessionInactive', {defaultValue: 'Session inactive'})}
          </Text>
        </View>
      </View>

      <Text style={{color: colors.textSecondary}}>
        {t('profile.accountStatus')}: {profile.data?.statut || '—'}
      </Text>
      <Text style={{color: colors.textSecondary}}>
        {t('rooms.subscription')}: {sub.data?.statut || '—'} · {sub.data?.dateFin || '—'}
      </Text>

      <Pressable
        onPress={onLogout}
        style={{
          padding: 14,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: 'rgba(220,38,38,0.35)',
          alignItems: 'center',
        }}>
        <Text style={{color: '#B91C1C', fontWeight: '700'}}>{t('settings.logout')}</Text>
      </Pressable>
    </ScrollView>
  );
}
