/**
 * Mon profil (lot S8) : logo (changer depuis la galerie), nom, slogan et
 * présentation de la boutique. `storeSlug` ne change jamais (non affiché en
 * champ). Lecture seule si le vendeur n'est pas `APPROVED`. Les erreurs sont
 * écrites dans l'app selon le statut (D17).
 */

import React, {useEffect, useState, useSyncExternalStore} from 'react';
import {Image, ScrollView, View} from 'react-native';
import {ErrorState, LoadingState, Text, TextField, useSellerColors, sellerMetrics} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {SellerPillButton} from '../components/SellerPillButton';
import {SellerSubHeader} from '../components/SellerSubHeader';
import {
  draftFromProfile,
  hasProfileChanges,
  profilePatch,
  validateProfile,
  type ProfileDraft,
  type ProfileField,
} from '../logic/sellerMore';
import {overviewErrorKey} from '../logic/sellerFormat';
import {sellerProfile, sellerProfileStore} from '../store/sellerProfileStore';

const P = 'commerce.sellerSpace.profile';

export type SellerProfileScreenProps = {
  header: React.ReactNode;
  initial: string;
  onBack: () => void;
};

export function SellerProfileScreen({header, initial, onBack}: SellerProfileScreenProps) {
  const sellerColors = useSellerColors();
  const {t} = useTranslation();
  const s = useSyncExternalStore(
    cb => sellerProfileStore.subscribe(() => cb()),
    sellerProfileStore.getState,
  );
  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    sellerProfile.clearErrors();
    void sellerProfile.load();
  }, []);

  // Le brouillon part du profil reçu, une seule fois (puis il reste à l'utilisateur).
  useEffect(() => {
    if (s.data && draft === null) {
      setDraft(draftFromProfile(s.data));
    }
  }, [s.data, draft]);

  const profile = s.data;
  const editable = profile?.status === 'APPROVED';
  const errors = profile && draft ? validateProfile(draft, profile.limits) : {};
  const fieldError = (f: ProfileField): string | undefined => {
    const e = showErrors ? errors[f] : undefined;
    if (!e) {
      return undefined;
    }
    return e === 'empty'
      ? t(`${P}.errors.nameEmpty`)
      : t(`${P}.errors.tooLong`, {max: profile ? profile.limits[`${f}Max` as 'storeNameMax' | 'sloganMax' | 'bioMax'] : 0});
  };

  const edit = (patch: Partial<ProfileDraft>) => {
    setSaved(false);
    sellerProfile.clearErrors();
    setDraft(d => (d ? {...d, ...patch} : d));
  };

  const save = async () => {
    if (!profile || !draft) {
      return;
    }
    if (Object.keys(errors).length > 0) {
      setShowErrors(true);
      return;
    }
    const ok = await sellerProfile.save(profilePatch(profile, draft));
    if (ok) {
      const next = sellerProfileStore.getState().data;
      if (next) {
        setDraft(draftFromProfile(next));
      }
      setShowErrors(false);
      setSaved(true);
    }
  };

  let body: React.ReactNode;
  if (s.status === 'error' && !profile) {
    body = (
      <ErrorState
        message={t(overviewErrorKey(s.error))}
        retryLabel={t('common.retry')}
        onRetry={() => void sellerProfile.load()}
        testID="seller-profile-error"
      />
    );
  } else if (!profile || !draft) {
    body = <LoadingState accessibilityLabel={t('content.loading')} testID="seller-profile-loading" />;
  } else {
    body = (
      <View style={{gap: 16, paddingHorizontal: sellerMetrics.margin}}>
        <View style={{alignItems: 'center', flexDirection: 'row', gap: 16}}>
          {profile.logoUrl ? (
            <Image
              source={{uri: profile.logoUrl}}
              accessibilityIgnoresInvertColors
              style={{backgroundColor: sellerColors.surfaceMuted, borderRadius: 9999, height: 72, width: 72}}
              testID="seller-profile-logo"
            />
          ) : (
            <View
              style={{
                alignItems: 'center',
                backgroundColor: sellerColors.surfaceMuted,
                borderRadius: 9999,
                height: 72,
                justifyContent: 'center',
                width: 72,
              }}>
              <Text variant="title" style={{color: sellerColors.accent}}>
                {initial}
              </Text>
            </View>
          )}
          <View style={{flex: 1, gap: 4}}>
            <SellerPillButton
              label={t(profile.logoUrl ? `${P}.changeLogo` : `${P}.addLogo`)}
              loading={s.uploadingLogo}
              disabled={!editable}
              onPress={() => void sellerProfile.changeLogo()}
              testID="seller-profile-logo-button"
            />
          </View>
        </View>
        {s.logoErrorKey ? (
          <Text variant="bodySmall" accessibilityLiveRegion="polite" style={{color: sellerColors.negativeText}} testID="seller-profile-logo-error">
            {t(s.logoErrorKey)}
          </Text>
        ) : (
          <Text variant="caption" style={{color: sellerColors.inkMuted}}>
            {t(`${P}.logoHint`)}
          </Text>
        )}

        {!editable ? (
          <Text variant="bodySmall" style={{color: sellerColors.negativeText}} testID="seller-profile-readonly">
            {t(`${P}.readOnly`)}
          </Text>
        ) : null}

        <TextField
          label={t(`${P}.nameLabel`)}
          value={draft.storeName}
          onChangeText={v => edit({storeName: v})}
          maxLength={profile.limits.storeNameMax}
          autoCapitalize="sentences"
          disabled={!editable}
          error={fieldError('storeName')}
          testID="seller-profile-name"
        />
        <TextField
          label={t(`${P}.sloganLabel`)}
          value={draft.slogan}
          onChangeText={v => edit({slogan: v})}
          placeholder={t(`${P}.sloganPlaceholder`)}
          maxLength={profile.limits.sloganMax}
          autoCapitalize="sentences"
          disabled={!editable}
          error={fieldError('slogan')}
          testID="seller-profile-slogan"
        />
        <TextField
          label={t(`${P}.bioLabel`)}
          value={draft.bio}
          onChangeText={v => edit({bio: v})}
          placeholder={t(`${P}.bioPlaceholder`)}
          maxLength={profile.limits.bioMax}
          autoCapitalize="sentences"
          multiline
          disabled={!editable}
          error={fieldError('bio')}
          testID="seller-profile-bio"
        />
        <Text variant="caption" style={{color: sellerColors.inkMuted, textAlign: 'right'}}>
          {draft.bio.length} / {profile.limits.bioMax}
        </Text>

        {s.saveErrorKey ? (
          <Text variant="bodySmall" accessibilityLiveRegion="polite" style={{color: sellerColors.negativeText}} testID="seller-profile-save-error">
            {t(s.saveErrorKey)}
          </Text>
        ) : null}
        {saved ? (
          <Text variant="bodySmall" accessibilityLiveRegion="polite" style={{color: sellerColors.positiveText}} testID="seller-profile-saved">
            {t(`${P}.saved`)}
          </Text>
        ) : null}
        <SellerPillButton
          label={t(`${P}.save`)}
          tone="orange"
          loading={s.saving}
          disabled={!editable || !hasProfileChanges(profile, draft)}
          onPress={() => void save()}
          testID="seller-profile-save"
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={{flex: 1, backgroundColor: sellerColors.bg}}
      contentContainerStyle={{paddingBottom: 32}}
      keyboardShouldPersistTaps="handled"
      testID="seller-profile">
      {header}
      <SellerSubHeader
        title={t(`${P}.title`)}
        backLabel={t('commerce.sellerSpace.tabs.more')}
        onBack={onBack}
        testID="seller-profile-back"
      />
      {body}
    </ScrollView>
  );
}
