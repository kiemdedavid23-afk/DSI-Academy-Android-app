import React, {useEffect, useSyncExternalStore} from 'react';
import {Linking} from 'react-native';
import {useTranslation} from '@shared/i18n';
import {SOCIAL_LINKS} from '@core/config/socialLinks';
import {APPLICATION_ID, APP_VERSION} from '@core/config/appInfo';
import {updateCheckStore} from '../store/updateCheckStore';
import {
  SettingsScaffold,
  SettingsGroup,
  SettingsRow,
  SettingsInfoRow,
  SettingsLabel,
  SettingsBadge,
} from '../components/SettingsKit';

export function SettingsHelpView({onBack}: {onBack: () => void}) {
  const {t} = useTranslation();
  const {checking, outcome} = useSyncExternalStore(
    updateCheckStore.subscribe,
    updateCheckStore.getState,
  );

  useEffect(() => () => updateCheckStore.reset(), []);

  const msg =
    outcome == null
      ? undefined
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
    <SettingsScaffold
      title={t('settings.help.title')}
      onBack={onBack}
      backLabel={t('settings.back')}
      testID="screen-settings-help">
      <SettingsGroup>
        <SettingsRow
          icon="HelpIcon"
          title={t('settings.contactSupport', {defaultValue: 'Contacter le support'})}
          disabled
          right={<SettingsBadge text={t('common.comingSoon')} />}
        />
      </SettingsGroup>

      {SOCIAL_LINKS.length > 0 ? (
        <SettingsGroup>
          {SOCIAL_LINKS.map(link => (
            <SettingsRow
              key={link.id}
              title={link.label}
              disabled={!link.href}
              onPress={() => {
                if (link.href) void Linking.openURL(link.href);
              }}
              chevron={!!link.href}
              right={!link.href ? <SettingsBadge text={t('common.comingSoon')} /> : undefined}
            />
          ))}
        </SettingsGroup>
      ) : null}

      <SettingsLabel>{t('settings.about', {defaultValue: 'À propos'})}</SettingsLabel>
      <SettingsGroup>
        <SettingsInfoRow label={APPLICATION_ID} value={`v${APP_VERSION}`} />
        <SettingsRow
          title={t('settings.checkUpdate', {defaultValue: 'Vérifier les mises à jour'})}
          desc={msg}
          onPress={() => void updateCheckStore.check()}
          disabled={checking}
          chevron
        />
      </SettingsGroup>
    </SettingsScaffold>
  );
}
