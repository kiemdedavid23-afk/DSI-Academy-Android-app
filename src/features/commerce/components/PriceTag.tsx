/** Prix en DSI, ou « Gratuit ». */

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
  return (
    <Text variant={large ? 'subtitle' : 'bodySmallStrong'} color="gold">
      {free ? t('shop.free') : t('commerce.priceDsi', {amount: formatDsiAmount(priceDsi)})}
    </Text>
  );
}
