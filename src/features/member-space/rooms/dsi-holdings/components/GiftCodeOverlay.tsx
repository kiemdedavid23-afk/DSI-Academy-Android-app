/**
 * Fenêtre code cadeau (site GiftCodeOverlay).
 */

import React, {useEffect, useRef, useState} from 'react';
import {
  Modal,
  View,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {Text, useTheme, Icon} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {redeemGiftCode} from '@core/api/endpoints/payment/codeCadeau.api';
import {memberBalanceStore} from '../../home/store/homeDashboardStore';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function GiftCodeOverlay({visible, onClose}: Props) {
  const {t, i18n} = useTranslation();
  const {colors, radii} = useTheme();
  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'fr-FR';
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [successAmount, setSuccessAmount] = useState<number | null>(null);
  const inputRef = useRef<TextInput>(null);
  const lock = useRef(false);

  useEffect(() => {
    if (visible) {
      setCode('');
      setErrorKey(null);
      setSuccessAmount(null);
      setSubmitting(false);
      lock.current = false;
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [visible]);

  const submit = async () => {
    if (lock.current || submitting) return;
    const valeur = code.trim();
    if (!valeur) {
      setErrorKey('dsi.gift.errors.empty');
      return;
    }
    lock.current = true;
    setSubmitting(true);
    setErrorKey(null);
    const res = await redeemGiftCode(valeur);
    setSubmitting(false);
    if (res.kind === 'failure') {
      lock.current = false;
      if (res.errorKind === 'tooMany') {
        setErrorKey('dsi.gift.tooManyAttempts');
      } else if (res.reason === 'empty') {
        setErrorKey('dsi.gift.errors.empty');
      } else {
        setErrorKey('dsi.gift.errors.unavailable');
      }
      return;
    }
    if (res.status === 'refuse') {
      lock.current = false;
      setErrorKey(
        res.reason === 'alreadyUsed'
          ? 'dsi.gift.errors.alreadyUsed'
          : 'dsi.gift.errors.invalid',
      );
      return;
    }
    setSuccessAmount(res.montantDsi);
    void memberBalanceStore.load({force: true});
    // keep lock until close
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
              {errorKey ? (
                <Text style={{color: colors.error}} accessibilityRole="alert">
                  {t(errorKey)}
                </Text>
              ) : null}
              <Pressable
                onPress={() => void submit()}
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
      </KeyboardAvoidingView>
    </Modal>
  );
}
