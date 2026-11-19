/** Étiquette de statut d'une commande (payé vert, en attente jaune, échoué rouge). */

import React from 'react';
import {View} from 'react-native';
import {Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {orderStatusKey} from '../logic/errorKey';
import {statusTone} from '../logic/purchases';
import type {CommerceOrder} from '../store/commerceTypes';

export function OrderStatusBadge({order}: {order: CommerceOrder}) {
  const {t} = useTranslation();
  const {colors, radii, spacing} = useTheme();
  const tone = statusTone(order.status);
  const palette = {
    success: {bg: colors.successBg, border: colors.successBorder, fg: colors.success},
    warning: {bg: colors.warningBg, border: colors.warningBorder, fg: colors.warning},
    danger: {bg: colors.errorBg, border: colors.errorBorder, fg: colors.error},
    neutral: {bg: colors.bgSurfaceAlt, border: colors.borderLight, fg: colors.textSecondary},
  }[tone];
  return (
    <View
      testID={`order-status-${order.id}`}
      style={{
        alignSelf: 'flex-start',
        backgroundColor: palette.bg,
        borderColor: palette.border,
        borderRadius: radii.pill,
        borderWidth: 1,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
      }}>
      <Text variant="caption" style={{color: palette.fg}}>
        {t(orderStatusKey(order.status, order.rawStatus))}
      </Text>
    </View>
  );
}
