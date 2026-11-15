import {http} from '@core/network';
import {
  NetworkError,
  RequestAbortedError,
  TimeoutError,
} from '@core/network/errors';
import {mapRedeemCode} from './codeCadeau.mapper';
import type {RedeemCodeResult} from './codeCadeau.types';

export async function redeemGiftCode(code: string): Promise<RedeemCodeResult> {
  try {
    const response = await http.service('payment').post(
      '/api/dsi/utiliser-code',
      {code},
      {auth: 'bearer'},
    );
    return mapRedeemCode(response.status, response.body, response.bodyKind);
  } catch (err) {
    if (
      err instanceof NetworkError ||
      err instanceof TimeoutError ||
      err instanceof RequestAbortedError
    ) {
      return {kind: 'failure', errorKind: 'network'};
    }
    return {kind: 'failure', errorKind: 'server'};
  }
}
