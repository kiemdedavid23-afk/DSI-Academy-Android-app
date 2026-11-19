/**
 * Codes promo de la Boutique (sous-onglet Codes de Mes achats). Le code est vérifié
 * par le Worker (aperçu) et gardé pour le panier ; il n'est définitivement validé
 * qu'au paiement. Ne parle qu'aux stores (R-LAY-5).
 */

import React, {useState, useSyncExternalStore} from 'react';
import {ScrollView, View} from 'react-native';
import {Button, Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {CommerceSearchField} from '../components/CommerceSearchField';
import {shopCartStore} from '../store/cartStore';

export type ShopPromoCodesScreenProps = {
  shellHeader: React.ReactNode;
  onOpenCart?: () => void;
};

export function ShopPromoCodesScreen({shellHeader, onOpenCart}: ShopPromoCodesScreenProps) {
  const {t} = useTranslation();
  const {colors, spacing} = useTheme();
  const cart = useSyncExternalStore(shopCartStore.subscribe, shopCartStore.getState);
  const [code, setCode] = useState('');

  const message =
    cart.promoStatus === 'valid' && cart.promo
      ? cart.promo.kind === 'percent'
        ? t('commerce.cart.promoValid', {code: cart.promo.code, value: cart.promo.value})
        : t('commerce.cart.promoValidOther', {code: cart.promo.code})
      : cart.promoStatus === 'invalid'
        ? t('commerce.cart.promoInvalid')
        : t('commerce.cart.promoNote');

  return (
    <ScrollView
      style={{flex: 1, backgroundColor: colors.bgApp}}
      contentContainerStyle={{gap: spacing.lg, paddingBottom: spacing.xxxl}}
      keyboardShouldPersistTaps="handled"
      testID="screen-shop-codes">
      {shellHeader}
      <Text variant="body" color="secondary" style={{paddingHorizontal: spacing.xl}}>
        {t('commerce.shell.codesIntro')}
      </Text>
      <CommerceSearchField
        value={code}
        onChangeText={setCode}
        placeholder={t('commerce.cart.promoLabel')}
        accessibilityLabel={t('commerce.cart.promoLabel')}
        testID="codes-input"
      />
      <View style={{flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.xl}}>
        <Button
          variant="secondary"
          label={t(
            cart.promoStatus === 'checking'
              ? 'commerce.cart.promoChecking'
              : 'commerce.cart.promoApply',
          )}
          loading={cart.promoStatus === 'checking'}
          disabled={code.trim() === ''}
          onPress={() => void shopCartStore.previewPromo(code)}
          testID="codes-apply"
        />
        {cart.promo ? (
          <Button
            variant="ghost"
            label={t('commerce.cart.promoRemove')}
            onPress={() => {
              shopCartStore.clearPromo();
              setCode('');
            }}
            testID="codes-remove"
          />
        ) : null}
      </View>
      <Text
        variant="caption"
        color="secondary"
        style={{paddingHorizontal: spacing.xl}}
        testID="codes-message">
        {message}
      </Text>
      {cart.promo && onOpenCart ? (
        <View style={{paddingHorizontal: spacing.xl}}>
          <Button label={t('commerce.cart.title')} onPress={onOpenCart} testID="codes-open-cart" />
        </View>
      ) : null}
    </ScrollView>
  );
}
