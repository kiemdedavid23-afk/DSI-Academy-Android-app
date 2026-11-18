/** Bouton « Acheter » (plein or, site : .dsi-pd-buy) + fenêtre d'achat. Branché dans la barre de la fiche. */

import React from 'react';
import {Pressable} from 'react-native';
import {Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {COMMERCE_STORES} from '../store/commerceStores';
import type {CommerceProduct} from '../store/commerceTypes';
import {PurchaseSheet, type PurchaseSheetProps} from './PurchaseSheet';

export type PurchaseActionProps = PurchaseSheetProps & {
  product: CommerceProduct;
};

export function PurchaseAction({product, ...sheet}: PurchaseActionProps) {
  const {t} = useTranslation();
  const {colors, radii, touch} = useTheme();
  return (
    <>
      <Pressable
        onPress={() => COMMERCE_STORES[sheet.source].purchase.start(product)}
        accessibilityRole="button"
        accessibilityLabel={product.free ? t('mp.pd.getFree') : t('mp.pd.buy')}
        testID="commerce-buy"
        style={({pressed}) => ({
          alignItems: 'center',
          backgroundColor: colors.goldPrestige,
          borderColor: colors.goldPrestige,
          borderRadius: radii.md,
          borderWidth: 1,
          justifyContent: 'center',
          minHeight: touch.min + 4,
          opacity: pressed ? 0.85 : 1,
          paddingHorizontal: 16,
        })}>
        <Text variant="bodyStrong" style={{color: colors.bgDarkPremium}}>
          {product.free ? t('mp.pd.getFree') : t('mp.pd.buy')}
        </Text>
      </Pressable>
      <PurchaseSheet {...sheet} />
    </>
  );
}
