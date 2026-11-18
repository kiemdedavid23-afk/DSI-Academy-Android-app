/** Prix en DSI (site : .dsi-mpc-price) : montant en gras, « DSI » en petit et en gris ; « Gratuit » sinon. */

import React from 'react';
import {Text} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {formatDsiAmount} from '../logic/format';

export type PriceTagProps = {
  priceDsi: number;
  free: boolean;
  large?: boolean;
};

export function PriceTag({priceDsi, free, large = false}: PriceTagProps) {
  const {t} = useTranslation();
  const variant = large ? 'subtitle' : 'bodyStrong';
  if (free) {
    return <Text variant={variant}>{t('mp.card.free')}</Text>;
  }
  return (
    <Text variant={variant} accessibilityLabel={t('commerce.priceDsi', {amount: formatDsiAmount(priceDsi)})}>
      {formatDsiAmount(priceDsi)}{' '}
      <Text variant="micro" color="secondary">
        {t('mp.card.currency')}
      </Text>
    </Text>
  );
}
