/**
 * Formulaire unique du profil communautaire : création (premier accès) et
 * modification (reprend site : community-profile/CommunityProfileForm.jsx).
 * Utilisé uniquement dans la page Profil de l'espace membre.
 */

import React, {useState} from 'react';
import {Pressable, Switch, View} from 'react-native';
import type {CommunityProfile} from '@core/api/endpoints/community/me.types';
import {Button, Text, TextField, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {
  DISPLAY_NAME_MAX_LENGTH,
  PSEUDONYM_MAX_LENGTH,
  isPseudonymValid,
  isReservedPseudonym,
  normalizePseudonym,
} from '@shared/community';
import {
  createCommunityProfileAction,
  saveCommunityProfileAction,
} from '@shared/store';

type Props = {
  profile: CommunityProfile | null;
  suggestedDisplayName?: string;
  onSaved: (opts?: {keepOpen?: boolean}) => void;
  onCancel?: () => void;
};

type FormError = {key: string; field: string | null};

export function CommunityProfileForm({
  profile,
  suggestedDisplayName = '',
  onSaved,
  onCancel,
}: Props) {
  const {t} = useTranslation();
  const {colors, spacing} = useTheme();
  const isEdit = profile !== null;

  const [displayName, setDisplayName] = useState(
    profile?.displayName ?? suggestedDisplayName,
  );
  const [pseudonym, setPseudonym] = useState(profile?.pseudonym ?? '');
  const [discoverable, setDiscoverable] = useState(
    profile ? profile.discoverable !== false : true,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<FormError | null>(null);

  const currentPseudonym = profile?.pseudonym ?? '';
  const typedClean = pseudonym.trim().replace(/^@+/, '');
  const normalized = normalizePseudonym(pseudonym);
  const pseudonymChanged = isEdit
    ? normalized !== currentPseudonym
    : normalized !== '';
  const looksDifferent = normalized !== typedClean;

  const validate = (): FormError | null => {
    if (!displayName.trim()) {
      return {key: 'communityProfile.errors.displayName', field: 'displayName'};
    }
    if (pseudonymChanged) {
      if (!isPseudonymValid(normalized)) {
        return {key: 'communityProfile.errors.pseudonym', field: 'pseudonym'};
      }
      if (isReservedPseudonym(normalized)) {
        return {
          key: 'communityProfile.errors.pseudonymReserved',
          field: 'pseudonym',
        };
      }
    }
    return null;
  };

  const submit = async () => {
    if (saving) {
      return;
    }
    const invalid = validate();
    if (invalid) {
      setError(invalid);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const name = displayName.trim();
      if (!profile) {
        const res = await createCommunityProfileAction({
          displayName: name,
          pseudonym: normalized || undefined,
          discoverable,
        });
        if (!res.ok) {
          setError({key: res.errorKey, field: res.field});
          return;
        }
        onSaved();
        return;
      }
      const nameChanged = name !== profile.displayName;
      const visibilityChanged = discoverable !== (profile.discoverable !== false);
      const res = await saveCommunityProfileAction(profile, {
        displayName: nameChanged ? name : undefined,
        discoverable: visibilityChanged ? discoverable : undefined,
        pseudonym: pseudonymChanged ? normalized : undefined,
      });
      if (!res.ok) {
        setError({key: res.errorKey, field: res.field});
        if (res.partialSaved) {
          onSaved({keepOpen: true});
        }
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const pseudonymHelper = (() => {
    if (!isEdit && !normalized) {
      return t('communityProfile.pseudonymAuto');
    }
    if (normalized && looksDifferent) {
      return t('communityProfile.pseudonymPreview', {value: `@${normalized}`});
    }
    if (normalized) {
      return t('communityProfile.pseudonymHint');
    }
    return undefined;
  })();

  const nameError = error?.field === 'displayName' ? error : null;
  const pseudoError = error?.field === 'pseudonym' ? error : null;
  const otherError = error && !nameError && !pseudoError ? error : null;
  const errText = (e: FormError) =>
    t(e.key, {max: DISPLAY_NAME_MAX_LENGTH});

  return (
    <View style={{gap: spacing.md}} testID="community-profile-form">
      <TextField
        label={t('communityProfile.displayNameLabel')}
        value={displayName}
        onChangeText={setDisplayName}
        maxLength={DISPLAY_NAME_MAX_LENGTH}
        autoComplete="nickname"
        helper={t('communityProfile.displayNameHint', {
          max: DISPLAY_NAME_MAX_LENGTH,
        })}
        error={nameError ? errText(nameError) : undefined}
        disabled={saving}
        testID="community-form-name"
      />
      <TextField
        label={`@ ${t('communityProfile.pseudonymLabel')}`}
        value={pseudonym}
        onChangeText={setPseudonym}
        maxLength={PSEUDONYM_MAX_LENGTH * 2}
        autoCapitalize="none"
        autoComplete="off"
        placeholder={isEdit ? '' : t('communityProfile.pseudonymPlaceholder')}
        helper={pseudonymHelper}
        error={pseudoError ? errText(pseudoError) : undefined}
        disabled={saving}
        testID="community-form-pseudonym"
      />
      {isEdit && pseudonymChanged && isPseudonymValid(normalized) ? (
        <Text style={{fontSize: 12.5, color: colors.textSecondary}}>
          {t('communityProfile.pseudonymChangeWarning', {
            old: `@${currentPseudonym}`,
          })}
        </Text>
      ) : null}

      <Pressable
        onPress={() => setDiscoverable(v => !v)}
        accessibilityRole="switch"
        accessibilityState={{checked: discoverable, disabled: saving}}
        accessibilityLabel={t('communityProfile.discoverableLabel')}
        disabled={saving}
        style={{flexDirection: 'row', alignItems: 'center', gap: spacing.md}}
        testID="community-form-discoverable">
        <View style={{flex: 1, gap: spacing.xs}}>
          <Text style={{fontSize: 14.5, fontWeight: '600', color: colors.textPrimary}}>
            {t('communityProfile.discoverableLabel')}
          </Text>
          <Text style={{fontSize: 12, color: colors.textMuted}}>
            {t('communityProfile.discoverableHint')}
          </Text>
        </View>
        <Switch value={discoverable} onValueChange={setDiscoverable} disabled={saving} />
      </Pressable>

      {otherError ? (
        <Text
          accessibilityRole="alert"
          style={{fontSize: 13, color: colors.error}}
          testID="community-form-error">
          {errText(otherError)}
        </Text>
      ) : null}

      <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm}}>
        <Button
          label={
            saving
              ? t('communityProfile.saving')
              : isEdit
              ? t('communityProfile.save')
              : t('communityProfile.create')
          }
          onPress={submit}
          loading={saving}
          testID="community-form-submit"
        />
        {onCancel ? (
          <Button
            variant="secondary"
            label={t('communityProfile.cancel')}
            onPress={onCancel}
            disabled={saving}
            testID="community-form-cancel"
          />
        ) : null}
      </View>
    </View>
  );
}
