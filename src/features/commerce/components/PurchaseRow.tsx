/** Carte horizontale d'une commande : vignette, titre, date, prix, statut, actions. */

import React from 'react';
import {View} from 'react-native';
import {Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {formatDsiAmount} from '../logic/format';
import {orderTitle} from '../logic/purchases';
import type {CommerceOrder} from '../store/commerceTypes';
import {OrderStatusBadge} from './OrderStatusBadge';
import {ProductCover} from './ProductCover';

export type PurchaseRowProps = {
  order: CommerceOrder;
  /** Boutons et messages propres à l'écran (vérifier, ouvrir). */
  children?: React.ReactNode;
};

const THUMB = 72;

export function PurchaseRow({order, children}: PurchaseRowProps) {
  const {t} = useTranslation();
  const {colors, spacing, radii} = useTheme();
  const {title, more} = orderTitle(order);
  const name = title ?? t('mp.orders.fallbackTitle');
  return (
    <View
      testID={`order-${order.id}`}
      style={{
        backgroundColor: colors.bgSurface,
        borderColor: colors.borderLight,
        borderRadius: radii.md,
        borderWidth: 1,
        gap: spacing.sm,
        marginHorizontal: spacing.xl,
        padding: spacing.md,
      }}>
      <View style={{flexDirection: 'row', gap: spacing.md}}>
        <View style={{width: THUMB}}>
          <ProductCover coverUrl={null} title={name} aspect={1} initialVariant="title" />
        </View>
        <View style={{flex: 1, gap: spacing.xs}}>
          <Text variant="cardTitle" numberOfLines={2}>
            {more > 0 ? `${name} +${more}` : name}
          </Text>
          {order.createdAt ? (
            <Text variant="caption" color="secondary">
              {new Date(order.createdAt).toLocaleDateString()}
            </Text>
          ) : null}
          <Text variant="bodySmallStrong" color="gold">
            {t('commerce.priceDsi', {amount: formatDsiAmount(order.totalDsi)})}
          </Text>
          <OrderStatusBadge order={order} />
        </View>
      </View>
      {children}
    </View>
  );
}
