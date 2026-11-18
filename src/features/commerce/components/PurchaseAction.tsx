/** Bouton « Acheter » de la fiche + fenêtre d'achat. Branché dans `renderAction`. */

import React from 'react';
import {Button} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {COMMERCE_STORES} from '../store/commerceStores';
import type {CommerceProduct} from '../store/commerceTypes';
import {PurchaseSheet, type PurchaseSheetProps} from './PurchaseSheet';

export type PurchaseActionProps = PurchaseSheetProps & {
  product: CommerceProduct;
};

export function PurchaseAction({product, ...sheet}: PurchaseActionProps) {
  const {t} = useTranslation();
  return (
    <>
      <Button
        label={t('mp.buy')}
        onPress={() => COMMERCE_STORES[sheet.source].purchase.start(product)}
        testID="commerce-buy"
      />
      <PurchaseSheet {...sheet} />
    </>
  );
}
