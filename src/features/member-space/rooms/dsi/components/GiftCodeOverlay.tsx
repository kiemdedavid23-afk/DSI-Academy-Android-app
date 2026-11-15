/**
 * Fenêtre code cadeau (site GiftCodeOverlay).
 */

import React, {useEffect, useRef, useState, useSyncExternalStore} from 'react';
import type {ComponentRef} from 'react';
import {
  Modal,
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {Text, useTheme, Icon} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {bannerStore} from '@shared/store';
import {ShellBanner} from '../../../shell/components/ShellBanner';
import {giftCodeStore} from '../store/giftCodeStore';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function GiftCodeOverlay({visible, onClose}: Props) {
  const {t, i18n} = useTranslation();
  const {colors, radii} = useTheme();
  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'fr-FR';
  const [code, setCode] = useState('');
  const {submitting, errorKey, errorMessage, successAmount} = useSyncExternalStore(
    giftCodeStore.subscribe,
    giftCodeStore.getState,
  );
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);

  useEffect(() => {
    if (!visible) {
      return undefined;
    }
    setCode('');
    giftCodeStore.reset();
    const timer = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, [visible]);

  // Seule la saisie vide reste sous le champ ; le reste (Worker, réseau) va en bannière.
  const emptyError = errorKey === 'dsi.gift.errors.empty';
  useEffect(() => {
    if (errorMessage) {
      bannerStore.notify({tone: 'error', type: 'gift-error', message: errorMessage});
    } else if (errorKey && errorKey !== 'dsi.gift.errors.empty') {
      bannerStore.notify({tone: 'error', type: 'gift-error', message: t(errorKey)});
    }
  }, [errorMessage, errorKey, t]);

  const submit = () => {
    void giftCodeStore.submit(code);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: 20}}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View
          style={{
            backgroundColor: colors.bgSurface,
            borderRadius: radii.lg,
            padding: 20,
            gap: 12,
          }}
          accessibilityViewIsModal>
          <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
            <Text style={{fontFamily: 'Fraunces-Bold', fontSize: 18, color: colors.textPrimary}}>
              {successAmount != null
                ? t('dsi.gift.successTitle')
                : t('dsi.gift.title', {defaultValue: t('dsi.giftBannerTitle')})}
            </Text>
            <Pressable onPress={onClose} accessibilityLabel={t('common.close')}>
              <Icon name="CloseIcon" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          {successAmount != null ? (
            <View accessibilityRole="summary">
              <Text style={{color: colors.success, fontWeight: '700', fontSize: 16}}>
                {t('dsi.gift.successAmount', {
                  amount: new Intl.NumberFormat(locale).format(successAmount),
                })}
              </Text>
            </View>
          ) : (
            <>
              <Text style={{color: colors.textSecondary, fontSize: 13}}>
                {t('dsi.gift.label')}
              </Text>
              <TextInput
                ref={inputRef}
                value={code}
                onChangeText={setCode}
                maxLength={64}
                autoCapitalize="characters"
                autoCorrect={false}
                autoComplete="off"
                style={{
                  borderWidth: 1,
                  borderColor: colors.borderLight,
                  borderRadius: 8,
                  padding: 12,
                  color: colors.textPrimary,
                  fontSize: 16,
                }}
                testID="gift-code-input"
              />
              {emptyError ? (
                <Text style={{color: colors.error}} accessibilityRole="alert">
                  {t('dsi.gift.errors.empty')}
                </Text>
              ) : null}
              <Pressable
                onPress={submit}
                disabled={submitting}
                style={{
                  backgroundColor: colors.bgDarkPremium,
                  padding: 14,
                  borderRadius: 10,
                  alignItems: 'center',
                  opacity: submitting ? 0.6 : 1,
                }}
                testID="gift-submit">
                {submitting ? (
                  <ActivityIndicator color={colors.goldPrestige} />
                ) : (
                  <Text style={{color: colors.goldPrestige, fontWeight: '700'}}>
                    {t('dsi.gift.submit', {defaultValue: t('dsi.giftOpen')})}
                  </Text>
                )}
              </Pressable>
            </>
          )}
        </View>
        <ShellBanner />
      </KeyboardAvoidingView>
    </Modal>
  );
}
