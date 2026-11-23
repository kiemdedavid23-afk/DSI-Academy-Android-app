/**
 * Réglages de la Communauté (reprend site : CommunityApp.jsx, écran Réglages).
 * Six interrupteurs, enregistrés par un bouton. Le Worker les enregistre mais
 * ne les applique pas encore : l'écran le dit, il ne promet rien (rapport §11.9).
 */

import React, {useEffect, useState, useSyncExternalStore} from 'react';
import {ActivityIndicator, ScrollView, Switch, View} from 'react-native';
import {
  PREFS_KEYS,
  PRIVACY_KEYS,
  type CommunitySettings,
  type PrefsKey,
  type PrivacyKey,
} from '@core/api/endpoints/community/settings.types';
import {Button, ErrorState, Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {CommunityGate} from '../components/CommunityGate';
import {saveSettingsAction, settingsStore} from '../store/settingsStore';

type Props = {
  onOpenProfile: () => void;
  onOpenSubscription: () => void;
};

export function CommunitySettingsScreen({onOpenProfile, onOpenSubscription}: Props) {
  const {t} = useTranslation();
  const {colors, spacing, radii} = useTheme();
  const state = useSyncExternalStore(
    cb => settingsStore.subscribe(() => cb()),
    () => settingsStore.getState(),
  );
  const [draft, setDraft] = useState<CommunitySettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{key: string; error: boolean} | null>(null);

  useEffect(() => {
    void settingsStore.load({force: true});
  }, []);
  // Le brouillon part des valeurs lues ; une relecture ne l'écrase pas une fois modifié.
  useEffect(() => {
    if (state.data && !draft) {
      setDraft(state.data);
    }
  }, [state.data, draft]);

  const setPrivacy = (key: PrivacyKey, value: boolean) => {
    setMessage(null);
    setDraft(d => (d ? {...d, privacy: {...d.privacy, [key]: value}} : d));
  };
  const setPrefs = (key: PrefsKey, value: boolean) => {
    setMessage(null);
    setDraft(d => (d ? {...d, prefs: {...d.prefs, [key]: value}} : d));
  };

  const save = async () => {
    if (!draft || saving) {
      return;
    }
    setSaving(true);
    setMessage(null);
    const res = await saveSettingsAction(draft);
    setSaving(false);
    setMessage(
      res.ok
        ? {key: 'communityApp.settings.saved', error: false}
        : {key: res.errorKey, error: true},
    );
  };

  const row = (label: string, value: boolean, onChange: (v: boolean) => void, testID: string) => (
    <View
      key={testID}
      style={{flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xs}}>
      <Text style={{flex: 1, fontSize: 15, color: colors.textPrimary}}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={saving}
        accessibilityLabel={label}
        trackColor={{false: colors.borderLight, true: colors.bluePrimary}}
        testID={testID}
      />
    </View>
  );

  const card = (title: string, children: React.ReactNode) => (
    <View
      style={{
        padding: spacing.md,
        gap: spacing.xs,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        backgroundColor: colors.bgSurfaceAlt,
      }}>
      <Text style={{fontSize: 16, fontWeight: '700', color: colors.textPrimary}}>{title}</Text>
      {children}
    </View>
  );

  const renderBody = () => {
    if (!draft) {
      if (state.status === 'error' && state.error) {
        return (
          <ErrorState
            message={t(state.error)}
            retryLabel={t('common.retry')}
            onRetry={() => void settingsStore.load({force: true})}
            testID="community-settings-error"
          />
        );
      }
      return (
        <View style={{padding: spacing.xl, alignItems: 'center'}} testID="community-settings-loading">
          <ActivityIndicator color={colors.bluePrimary} />
        </View>
      );
    }
    return (
      <>
        <Text style={{fontSize: 13, color: colors.textMuted}} testID="community-settings-notice">
          {t('communityApp.settings.notice')}
        </Text>
        {card(
          t('communityApp.settings.privacy'),
          PRIVACY_KEYS.map(k =>
            row(t(`communityApp.settings.${k}`), draft.privacy[k], v => setPrivacy(k, v), `community-setting-${k}`),
          ),
        )}
        {card(
          t('communityApp.settings.prefs'),
          PREFS_KEYS.map(k =>
            row(t(`communityApp.settings.${k}`), draft.prefs[k], v => setPrefs(k, v), `community-setting-${k}`),
          ),
        )}
        <Button
          label={t('communityApp.settings.save')}
          onPress={save}
          loading={saving}
          disabled={saving}
          testID="community-settings-save"
        />
        {message ? (
          <Text
            accessibilityRole="alert"
            style={{fontSize: 13, color: message.error ? colors.error : colors.textSecondary}}
            testID="community-settings-message">
            {t(message.key)}
          </Text>
        ) : null}
      </>
    );
  };

  return (
    <CommunityGate onOpenProfile={onOpenProfile} onOpenSubscription={onOpenSubscription}>
      <ScrollView
        contentContainerStyle={{padding: spacing.lg, gap: spacing.md}}
        testID="screen-community-settings">
        {renderBody()}
      </ScrollView>
    </CommunityGate>
  );
}
