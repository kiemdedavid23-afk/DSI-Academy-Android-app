/**
 * Sélecteur des montants d'AFFICHAGE (R-LAY-5 : les écrans n'importent pas
 * @core/config). Les valeurs viennent de core/config/pricing ; le Worker reste
 * seul juge des montants réellement crédités ou débités.
 */

import {
  RENEWAL_PRICE_DSI,
  REFERRAL_REWARD_N1_DSI,
  REFERRAL_REWARD_N2_DSI,
  WITHDRAWAL_FEE_FIXED_FCFA,
  WITHDRAWAL_FEE_RATE_NUM,
  WITHDRAWAL_FEE_RATE_DEN,
  WITHDRAWAL_WINDOW_START_HOUR,
  WITHDRAWAL_WINDOW_END_HOUR,
} from '@core/config/pricing';

export type DisplayPricing = {
  renewalPriceDsi: number;
  referralRewardN1Dsi: number;
  referralRewardN2Dsi: number;
  withdrawalFeeFixedFcfa: number;
  /** Part variable des frais de retrait, en pourcentage (ex. 4,5). */
  withdrawalFeeRatePct: number;
  withdrawalWindowStartHour: number;
  withdrawalWindowEndHour: number;
};

const PRICING: DisplayPricing = Object.freeze({
  renewalPriceDsi: RENEWAL_PRICE_DSI,
  referralRewardN1Dsi: REFERRAL_REWARD_N1_DSI,
  referralRewardN2Dsi: REFERRAL_REWARD_N2_DSI,
  withdrawalFeeFixedFcfa: WITHDRAWAL_FEE_FIXED_FCFA,
  withdrawalFeeRatePct: (WITHDRAWAL_FEE_RATE_NUM / WITHDRAWAL_FEE_RATE_DEN) * 100,
  withdrawalWindowStartHour: WITHDRAWAL_WINDOW_START_HOUR,
  withdrawalWindowEndHour: WITHDRAWAL_WINDOW_END_HOUR,
});

export function getDisplayPricing(): DisplayPricing {
  return PRICING;
}
