import React, {useEffect, useSyncExternalStore} from 'react';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from '@shared/i18n';
import {memberProfileStore, memberSubscriptionStore} from '@shared/store';
import {countryLabel} from '@core/data/countries';
import {formatShortDate, statusLabel} from '@core/utils/displayLabels';
import {
  SettingsScaffold,
  SettingsGroup,
  SettingsRow,
  SettingsInfoRow,
  SettingsLabel,
  SettingsBadge,
} from '../components/SettingsKit';

export function SettingsAccountView({onBack}: {onBack: () => void}) {
  const {t, i18n} = useTranslation();
  const navigation = useNavigation<any>();
  const lang = i18n.language?.startsWith('en') ? 'en' : 'fr';
  const profile = useSyncExternalStore(
    cb => memberProfileStore.subscribe(() => cb()),
    () => memberProfileStore.getState(),
  );
  const sub = useSyncExternalStore(
    cb => memberSubscriptionStore.subscribe(() => cb()),
    () => memberSubscriptionStore.getState(),
  );

  useEffect(() => {
    void memberProfileStore.load();
    void memberSubscriptionStore.load();
  }, []);

  const p = profile.data;
  const np = t('profile.notProvided');
  const soon = t('common.comingSoon');

  return (
    <SettingsScaffold
      title={t('settings.account.title')}
      onBack={onBack}
      backLabel={t('settings.back')}
      testID="screen-settings-account">
      <SettingsLabel>{t('common.readOnly')}</SettingsLabel>
      <SettingsGroup>
        <SettingsInfoRow label={t('profile.lastName')} value={p?.nom || np} />
        <SettingsInfoRow label={t('profile.firstName')} value={p?.prenom || np} />
        <SettingsInfoRow label={t('profile.email')} value={p?.email || np} />
        <SettingsInfoRow label={t('profile.whatsapp')} value={p?.whatsapp || np} />
        <SettingsInfoRow
          label={t('profile.country')}
          value={p?.pays ? countryLabel(p.pays, lang as 'fr' | 'en') : np}
        />
        <SettingsInfoRow label={t('profile.dsiId')} value={p?.identifiantDsi || np} />
      </SettingsGroup>

      <SettingsGroup>
        <SettingsRow
          icon="UserIcon"
          title={t('settings.viewProfile')}
          onPress={() => navigation.navigate('MemberProfile')}
          chevron
        />
        <SettingsRow
          icon="SubscriptionIcon"
          title={t('settings.manageSubscription', {defaultValue: 'Gérer mon abonnement'})}
          desc={`${statusLabel(t, sub.data?.statut)} · ${formatShortDate(sub.data?.dateFin, lang)}`}
          onPress={() => navigation.navigate('MemberSubscription')}
          chevron
        />
      </SettingsGroup>

      <SettingsGroup>
        <SettingsRow
          icon="HelpIcon"
          title={t('settings.contactSupport', {defaultValue: 'Contacter le support'})}
          disabled
          right={<SettingsBadge text={soon} />}
        />
        <SettingsRow
          icon="LogoutIcon"
          title={t('settings.deleteAccount', {defaultValue: 'Supprimer mon compte'})}
          danger
          disabled
          right={<SettingsBadge text={soon} />}
        />
      </SettingsGroup>
    </SettingsScaffold>
  );
}
