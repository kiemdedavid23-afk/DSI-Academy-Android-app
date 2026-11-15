import React, {useEffect, useSyncExternalStore} from 'react';
import {View, ScrollView, Pressable, Linking} from 'react-native';
import {Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {SOCIAL_LINKS} from '@core/config/socialLinks';
import {APPLICATION_ID, APP_VERSION} from '@core/config/appInfo';
import {updateCheckStore} from '../store/updateCheckStore';

export function SettingsHelpView({onBack}: {onBack: () => void}) {
  const {t} = useTranslation();
  const {colors, radii, glass} = useTheme();
  const {checking, outcome} = useSyncExternalStore(
    updateCheckStore.subscribe,
    updateCheckStore.getState,
  );

  useEffect(() => () => updateCheckStore.reset(), []);

  const msg =
    outcome == null
      ? null
      : outcome.kind === 'error'
        ? t('settings.updateError', {defaultValue: 'Impossible de vérifier'})
        : outcome.kind === 'available'
          ? t('settings.updateAvailable', {
              defaultValue: 'Version {{version}} disponible',
              version: outcome.version,
            })
          : t('settings.upToDate', {
              defaultValue: 'Vous avez la dernière version',
            });

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
      <Text style={{fontSize: 19.2, fontWeight: '800'}}>{t('settings.help.title')}</Text>

      <Text style={{opacity: 0.55, color: colors.textMuted}}>
        {t('settings.contactSupport', {defaultValue: 'Contacter le support'})} —{' '}
        {t('common.comingSoon')}
      </Text>

      {SOCIAL_LINKS.map(link => {
        const disabled = !link.href;
        return (
          <Pressable
            key={link.id}
            disabled={disabled}
            onPress={() => {
              if (link.href) void Linking.openURL(link.href);
            }}
            style={{
              padding: 14,
              borderRadius: radii.md,
              borderWidth: 1,
              borderColor: colors.borderLight,
              opacity: disabled ? 0.55 : 1,
              minHeight: 44,
              justifyContent: 'center',
            }}>
            <Text style={{fontWeight: '600', color: colors.textPrimary}}>
              {link.label}
              {disabled ? ` — ${t('common.comingSoon')}` : ''}
            </Text>
          </Pressable>
        );
      })}

      <View
        style={{
          padding: 16,
          borderRadius: radii.lg,
          backgroundColor: glass.bg,
          borderWidth: 1,
          borderColor: glass.border,
          gap: 8,
        }}>
        <Text style={{fontWeight: '700'}}>
          {t('settings.about', {defaultValue: 'À propos'})}
        </Text>
        <Text style={{color: colors.textSecondary}}>
          {APPLICATION_ID} · v{APP_VERSION}
        </Text>
        <Pressable
          onPress={() => void updateCheckStore.check()}
          disabled={checking}
          style={{
            marginTop: 8,
            backgroundColor: colors.bluePrimary,
            padding: 12,
            borderRadius: 8,
            alignItems: 'center',
            opacity: checking ? 0.6 : 1,
          }}>
          <Text style={{color: colors.textOnPrimary, fontWeight: '600'}}>
            {t('settings.checkUpdate', {defaultValue: 'Vérifier les mises à jour'})}
          </Text>
        </Pressable>
        {msg ? (
          <Text style={{color: colors.textSecondary, marginTop: 4}}>{msg}</Text>
        ) : null}
      </View>
    </ScrollView>
  );
}
