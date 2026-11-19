/** Ligne du panier en carte horizontale : vignette, titre, total, quantité, actions. */

import React from 'react';
import {View} from 'react-native';
import {Button, Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {formatDsiAmount} from '../logic/format';
import type {CommerceProduct} from '../store/commerceTypes';
import {ProductCover} from './ProductCover';

export type CartLineRowProps = {
  productId: string;
  qty: number;
  /** Absent : produit en lecture (`loading`) ou retiré du catalogue. */
  product: CommerceProduct | undefined;
  loading: boolean;
  busy: boolean;
  removing: boolean;
  onMinus: () => void;
  onPlus: () => void;
  onRemove: () => void;
  onDetails: (product: CommerceProduct) => void;
};

const THUMB = 72;

export function CartLineRow({
  productId,
  qty,
  product,
  loading,
  busy,
  removing,
  onMinus,
  onPlus,
  onRemove,
  onDetails,
}: CartLineRowProps) {
  const {t} = useTranslation();
  const {colors, spacing, radii} = useTheme();
  const title = product
    ? product.title
    : t(loading ? 'content.loading' : 'commerce.cart.unavailable');
  return (
    <View
      testID={`cart-line-${productId}`}
      style={{
        backgroundColor: colors.bgSurface,
        borderColor: colors.borderLight,
        borderRadius: radii.md,
        borderWidth: 1,
        gap: spacing.sm,
        padding: spacing.md,
      }}>
      <View style={{flexDirection: 'row', gap: spacing.md}}>
        <View style={{width: THUMB}}>
          <ProductCover
            coverUrl={product?.coverUrl ?? null}
            title={title}
            aspect={1}
            initialVariant="title"
          />
        </View>
        <View style={{flex: 1, gap: spacing.xs}}>
          <Text variant="cardTitle" numberOfLines={2}>
            {title}
          </Text>
          {product ? (
            <Text variant="bodySmallStrong" color="gold">
              {t('commerce.cart.lineTotal', {
                qty,
                amount: formatDsiAmount(product.priceDsi * qty),
              })}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm}}>
        {product ? (
          <>
            <Button
              variant="secondary"
              label="−"
              accessibilityLabel={t('commerce.cart.qtyMinus', {title: product.title})}
              disabled={busy}
              onPress={onMinus}
              testID={`cart-minus-${productId}`}
            />
            <Button
              variant="secondary"
              label="+"
              accessibilityLabel={t('commerce.cart.qtyPlus', {title: product.title})}
              disabled={busy}
              onPress={onPlus}
              testID={`cart-plus-${productId}`}
            />
            <Button
              variant="ghost"
              label={t('commerce.cart.details')}
              onPress={() => onDetails(product)}
            />
          </>
        ) : null}
        <Button
          variant="ghost"
          label={t('commerce.cart.remove')}
          disabled={busy}
          loading={removing}
          onPress={onRemove}
          testID={`cart-remove-${productId}`}
        />
      </View>
    </View>
  );
}
