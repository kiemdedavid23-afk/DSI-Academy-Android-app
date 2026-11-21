/** Onglet dont le lot n'est pas encore livré (Produits, Ventes, Analyses). */

import React from 'react';
import {ScrollView, View} from 'react-native';
import {Text, sellerColors} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import type {SellerTabId} from '../components/SellerTabIcon';

export function SellerSoonScreen({
  header,
  tab,
}: {
  header: React.ReactNode;
  tab: SellerTabId;
}) {
  const {t} = useTranslation();
  return (
    <ScrollView
      style={{flex: 1, backgroundColor: sellerColors.bg}}
      testID={`seller-soon-${tab}`}>
      {header}
      <View style={{gap: 8, padding: 16}}>
        <Text variant="title" accessibilityRole="header" style={{color: sellerColors.ink}}>
          {t(`commerce.sellerSpace.tabs.${tab}`)}
        </Text>
        <Text variant="body" style={{color: sellerColors.inkMuted}}>
          {t('commerce.sellerSpace.soon')}
        </Text>
      </View>
    </ScrollView>
  );
}
