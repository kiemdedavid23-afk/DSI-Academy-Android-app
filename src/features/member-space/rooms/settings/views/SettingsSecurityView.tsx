import React, {useSyncExternalStore} from 'react';
import {useTranslation} from '@shared/i18n';
import {memberProfileStore, memberSubscriptionStore} from '@shared/store';
import {sessionStore} from '@core/session';
import {formatShortDate, statusLabel} from '@core/utils/displayLabels';
import {
  SettingsScaffold,
  SettingsGroup,
  SettingsRow,
  SettingsInfoRow,
} from '../components/SettingsKit';

export function SettingsSecurityView({
  onBack,
  onLogout,
}: {
  onBack: () => void;
  onLogout: () => void;
}) {
  const {t, i18n} = useTranslation();
  const lang = i18n.language?.startsWith('en') ? 'en' : 'fr';
  const active = useSyncExternalStore(
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

  return (
    <SettingsScaffold
      title={t('settings.security.title')}
      onBack={onBack}
      backLabel={t('settings.back')}
      testID="screen-settings-security">
      <SettingsGroup>
        <SettingsRow
          icon="ShieldIcon"
          title={
            active
              ? t('settings.sessionActive', {defaultValue: 'Session active'})
              : t('settings.sessionInactive', {defaultValue: 'Session inactive'})
          }
        />
        <SettingsInfoRow
          label={t('profile.accountStatus')}
          value={statusLabel(t, profile.data?.statut)}
        />
        <SettingsInfoRow
          label={t('rooms.subscription')}
          value={`${statusLabel(t, sub.data?.statut)} · ${formatShortDate(sub.data?.dateFin, lang)}`}
        />
      </SettingsGroup>

      <SettingsGroup>
        <SettingsRow
          icon="LogoutIcon"
          title={t('settings.logout')}
          onPress={onLogout}
          danger
          testID="settings-security-logout"
        />
      </SettingsGroup>
    </SettingsScaffold>
  );
}
