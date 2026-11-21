/**
 * Candidature vendeur : assistant en 6 étapes (boutique, description, logo,
 * pièce d'identité, selfie, relecture). Les photos partent dès qu'elles sont
 * choisies ; le dépôt envoie les identifiants reçus. Retour Android : étape
 * précédente, puis confirmation avant de quitter (saisie et photos effacées).
 */

import React, {useCallback, useEffect, useSyncExternalStore} from 'react';
import {Alert, BackHandler, Pressable, ScrollView, View} from 'react-native';
import {Button, Icon, Text, TextField, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {ApplicationPhotoSlot} from '../components/ApplicationPhotoSlot';
import {
  APPLY_STEPS,
  isApplicationComplete,
  isStepValid,
  isUploading,
} from '../logic/applicationDraft';
import {sellerApplicationStore} from '../store/sellerApplicationStore';
import {APPLICATION_LIMITS} from '../store/sellerTypes';

const A = 'mp.apply';

export type SellerApplyScreenProps = {
  step: number;
  onStepChange: (step: number) => void;
  /** Quitte l'assistant (la saisie est déjà effacée). */
  onClose: () => void;
  /** Candidature déposée. */
  onSubmitted: () => void;
};

export function SellerApplyScreen({
  step,
  onStepChange,
  onClose,
  onSubmitted,
}: SellerApplyScreenProps) {
  const {t} = useTranslation();
  const {colors, spacing, radii} = useTheme();
  const store = sellerApplicationStore;
  const state = useSyncExternalStore(store.subscribe, store.getState);
  const {draft, slots} = state;

  const confirmLeave = useCallback(() => {
    Alert.alert(t(`${A}.w.leaveTitle`), t(`${A}.w.leaveText`), [
      {text: t(`${A}.w.leaveStay`), style: 'cancel'},
      {
        text: t(`${A}.w.leaveYes`),
        style: 'destructive',
        onPress: () => {
          store.discardDraft();
          onClose();
        },
      },
    ]);
  }, [onClose, store, t]);

  const back = useCallback(() => {
    if (step > 1) {
      onStepChange(step - 1);
    } else {
      confirmLeave();
    }
  }, [confirmLeave, onStepChange, step]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      back();
      return true;
    });
    return () => sub.remove();
  }, [back]);

  const valid = isStepValid(step, draft, slots);
  const busy = isUploading(slots) || state.submitStatus === 'sending';
  const complete = isApplicationComplete(draft, slots);

  const next = async () => {
    if (step < APPLY_STEPS) {
      onStepChange(step + 1);
      return;
    }
    if (await store.submit()) {
      onSubmitted();
    }
  };

  const cardStyle = {
    backgroundColor: colors.bgSurface,
    borderColor: colors.borderLight,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  };

  return (
    <View style={{flex: 1, backgroundColor: colors.bgApp}} testID="screen-seller-apply">
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          gap: spacing.md,
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.lg,
        }}>
        <Pressable
          onPress={confirmLeave}
          accessibilityRole="button"
          accessibilityLabel={t(`${A}.w.close`)}
          testID="apply-close"
          style={{alignItems: 'center', height: 44, justifyContent: 'center', width: 44}}>
          <Icon name="CloseIcon" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text variant="bodySmallStrong" color="secondary" style={{flex: 1}}>
          {t(`${A}.w.stepOf`, {current: step, total: APPLY_STEPS})}
        </Text>
      </View>
      <View
        accessibilityRole="progressbar"
        style={{
          backgroundColor: colors.borderLight,
          height: 4,
          marginHorizontal: spacing.xl,
          marginTop: spacing.sm,
        }}>
        <View
          style={{
            backgroundColor: colors.goldPrestige,
            height: 4,
            width: `${(step / APPLY_STEPS) * 100}%`,
          }}
        />
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          gap: spacing.lg,
          padding: spacing.xl,
          paddingBottom: spacing.xxxl,
        }}>
        <View style={{gap: spacing.xs}}>
          <Text variant="title" accessibilityRole="header">
            {t(`${A}.w.s${step}.title`)}
          </Text>
          <Text variant="body" color="secondary">
            {t(`${A}.w.s${step}.body`)}
          </Text>
        </View>

        {step === 1 ? (
          <View style={{gap: spacing.md}}>
            <TextField
              label={t(`${A}.step1.storeName`)}
              value={draft.storeName}
              onChangeText={v => store.setField('storeName', v)}
              maxLength={APPLICATION_LIMITS.storeName}
              autoCapitalize="sentences"
              testID="apply-store-name"
            />
            <TextField
              label={t(`${A}.step1.slogan`)}
              value={draft.slogan}
              onChangeText={v => store.setField('slogan', v)}
              maxLength={APPLICATION_LIMITS.slogan}
              autoCapitalize="sentences"
              testID="apply-slogan"
            />
          </View>
        ) : null}

        {step === 2 ? (
          <View style={{gap: spacing.sm}}>
            <TextField
              label={t(`${A}.step1.description`)}
              placeholder={t(`${A}.step1.descriptionPlaceholder`)}
              value={draft.description}
              onChangeText={v => store.setField('description', v)}
              maxLength={APPLICATION_LIMITS.description}
              autoCapitalize="sentences"
              multiline
              helper={`${draft.description.length} / ${APPLICATION_LIMITS.description}`}
              testID="apply-description"
            />
            <Text variant="caption" color="muted">
              {t(`${A}.w.s2.tip`)}
            </Text>
          </View>
        ) : null}

        {step === 3 ? (
          <ApplicationPhotoSlot
            slotKey="logo"
            slot={slots.logo}
            onPick={src => void store.pickAndUpload('logo', src)}
          />
        ) : null}

        {step === 4 ? (
          <View style={{gap: spacing.md}}>
            <Text variant="caption" color="muted">
              {t(`${A}.step2.privacy`)}
            </Text>
            <ApplicationPhotoSlot
              slotKey="id_front"
              slot={slots.id_front}
              onPick={src => void store.pickAndUpload('id_front', src)}
            />
            <ApplicationPhotoSlot
              slotKey="id_back"
              slot={slots.id_back}
              onPick={src => void store.pickAndUpload('id_back', src)}
            />
          </View>
        ) : null}

        {step === 5 ? (
          <ApplicationPhotoSlot
            slotKey="id_selfie"
            slot={slots.id_selfie}
            onPick={src => void store.pickAndUpload('id_selfie', src)}
          />
        ) : null}

        {step === 6 ? (
          <View style={{gap: spacing.md}}>
            <View style={cardStyle}>              <Text variant="caption" color="muted">
                {t(`${A}.step3.shop`)}
              </Text>
              <Text variant="subtitle">{draft.storeName.trim()}</Text>
              <Text variant="caption" color="muted">
                {t(`${A}.step3.slogan`)}
              </Text>
              <Text variant="body">{draft.slogan.trim()}</Text>
              <Text variant="caption" color="muted">
                {t(`${A}.step3.description`)}
              </Text>
              <Text variant="body">{draft.description.trim()}</Text>
            </View>
            <Text variant="bodySmall" color="secondary">
              {t(`${A}.step3.consent`)}
            </Text>
            {!complete ? (
              <Text variant="bodySmall" color="error">
                {t(`${A}.submitErrors.invalid`)}
              </Text>
            ) : null}
            {state.submitStatus === 'error' && state.submitErrorKey ? (
              <Text
                variant="bodySmall"
                color="error"
                accessibilityLiveRegion="polite"
                testID="apply-submit-error">
                {t(state.submitErrorKey)}
              </Text>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <View
        style={{
          borderColor: colors.borderLight,
          borderTopWidth: 1,
          flexDirection: 'row',
          gap: spacing.md,
          padding: spacing.lg,
        }}>
        <Button
          variant="secondary"
          label={t(`${A}.nav.back`)}
          onPress={back}
          disabled={state.submitStatus === 'sending'}
          style={{flex: 1}}
          testID="apply-back"
        />
        <Button
          label={
            step === APPLY_STEPS
              ? t(
                  state.submitStatus === 'sending'
                    ? `${A}.step3.submitting`
                    : `${A}.step3.submit`,
                )
              : t(`${A}.nav.continue`)
          }
          onPress={() => void next()}
          disabled={!valid || busy || (step === APPLY_STEPS && !complete)}
          loading={state.submitStatus === 'sending'}
          style={{flex: 2}}
          testID="apply-next"
        />
      </View>
    </View>
  );
}
