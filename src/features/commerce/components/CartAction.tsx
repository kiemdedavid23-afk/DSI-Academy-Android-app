/** Bouton « Ajouter au panier » de la fiche Boutique (L8d). */

import React, {useEffect, useState, useSyncExternalStore} from 'react';
import {View} from 'react-native';
import {Button, Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {commerceErrorKey} from '../logic/errorKey';
import {shopCartStore} from '../store/cartStore';
import type {CommerceProduct} from '../store/commerceTypes';

export type CartActionProps = {
  product: CommerceProduct;
  onOpenCart: () => void;
};

export function CartAction({product, onOpenCart}: CartActionProps) {
  const {t} = useTranslation();
  const {spacing} = useTheme();
  const cart = useSyncExternalStore(
    shopCartStore.subscribe,
    shopCartStore.getState,
  );
  const [errorKey, setErrorKey] = useState<string | null>(null);

  useEffect(() => {
    void shopCartStore.load();
  }, []);

  const inCart = cart.lines.some(l => l.productId === product.id);
  const busy = cart.busyId === product.id;

  const add = async () => {
    setErrorKey(null);
    const res = await shopCartStore.add(product.id);
    if (!res.ok) {
      setErrorKey(commerceErrorKey(res.errorKind));
    }
  };

  return (
    <View style={{gap: spacing.sm}}>
      {errorKey ? (
        <Text variant="caption" color="secondary" testID="cart-add-error">
          {t(errorKey)}
        </Text>
      ) : null}
      {inCart ? (
        <Button
          label={t('commerce.cart.open')}
          onPress={onOpenCart}
          testID="cart-open"
        />
      ) : (
        <Button
          label={t('commerce.cart.add')}
          loading={busy}
          onPress={() => void add()}
          testID="cart-add"
        />
      )}
    </View>
  );
}
