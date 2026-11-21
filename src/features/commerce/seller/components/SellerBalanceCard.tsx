/** Carte sombre « Solde disponible » avec le bouton orange « Retirer ». */

import React from 'react';
import {View} from 'react-native';
import {Text, sellerColors, sellerMetrics} from '@shared/designsystem';
import {SellerPillButton} from './SellerPillButton';

export type SellerBalanceCardProps = {
  label: string;
  amount: string;
  currency: string;
  /** Ligne facultative sous le montant (« En attente : … »). */
  pendingText?: string;
  withdrawLabel: string;
  onWithdraw: () => void;
};

export function SellerBalanceCard({
  label,
  amount,
  currency,
  pendingText,
  withdrawLabel,
  onWithdraw,
}: SellerBalanceCardProps) {
  return (
    <View
      testID="seller-balance-card"
      style={{
        backgroundColor: sellerColors.ink,
        borderRadius: sellerMetrics.cardRadius,
        gap: 12,
        padding: sellerMetrics.cardPadding,
      }}>
      <Text variant="bodySmall" style={{color: sellerColors.inkOnDarkMuted}}>
        {label}
      </Text>
      <View style={{alignItems: 'baseline', flexDirection: 'row', gap: 6}}>
        <Text variant="display" style={{color: sellerColors.onDark}}>
          {amount}
        </Text>
        <Text variant="bodySmallStrong" style={{color: sellerColors.inkOnDarkMuted}}>
          {currency}
        </Text>
      </View>
      {pendingText ? (
        <Text variant="caption" style={{color: sellerColors.inkOnDarkMuted}}>
          {pendingText}
        </Text>
      ) : null}
      <SellerPillButton
        tone="orange"
        label={withdrawLabel}
        onPress={onWithdraw}
        testID="seller-withdraw"
      />
    </View>
  );
}
