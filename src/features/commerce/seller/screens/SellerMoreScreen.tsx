/** Onglet Plus : accès aux retraits et sortie de l'espace vendeur. */

import React from 'react';
import {Pressable, ScrollView, View} from 'react-native';
import {Icon, Text, sellerColors, sellerMetrics} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';

export type SellerMoreScreenProps = {
  header: React.ReactNode;
  onWithdrawals: () => void;
  onExit: () => void;
};

function Row({
  label,
  onPress,
  testID,
  danger = false,
}: {
  label: string;
  onPress: () => void;
  testID: string;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      testID={testID}
      style={{
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        minHeight: 52,
        paddingHorizontal: sellerMetrics.cardPadding,
      }}>
      <Text
        variant="bodyStrong"
        style={{color: danger ? sellerColors.negativeText : sellerColors.ink}}>
        {label}
      </Text>
      <Icon name="ChevronRightIcon" size={18} color={sellerColors.inkMuted} />
    </Pressable>
  );
}

export function SellerMoreScreen({header, onWithdrawals, onExit}: SellerMoreScreenProps) {
  const {t} = useTranslation();
  return (
    <ScrollView
      style={{flex: 1, backgroundColor: sellerColors.bg}}
      testID="seller-more">
      {header}
      <View style={{gap: 12, padding: sellerMetrics.margin}}>
        <Text variant="title" accessibilityRole="header" style={{color: sellerColors.ink}}>
          {t('commerce.sellerSpace.tabs.more')}
        </Text>
        <View
          style={{
            backgroundColor: sellerColors.bg,
            borderColor: sellerColors.border,
            borderRadius: sellerMetrics.cardRadius,
            borderWidth: 1,
            overflow: 'hidden',
          }}>
          <Row
            label={t('commerce.sellerSpace.more.withdrawals')}
            onPress={onWithdrawals}
            testID="seller-more-withdrawals"
          />
          <View style={{backgroundColor: sellerColors.border, height: 1}} />
          <Row
            label={t('commerce.sellerSpace.more.quit')}
            onPress={onExit}
            testID="seller-more-quit"
            danger
          />
        </View>
      </View>
    </ScrollView>
  );
}
