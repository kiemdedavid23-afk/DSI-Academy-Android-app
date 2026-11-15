/**
 * POST /api/abonnement/renouveler — Bearer.
 */

import {http} from '@core/network';
import {
  NetworkError,
  RequestAbortedError,
  TimeoutError,
} from '@core/network/errors';
import {mapRenewSubscription} from './abonnement.mapper';
import type {RenewRequest, RenewResult} from './abonnement.types';

function catchNet(err: unknown): RenewResult {
  if (
    err instanceof NetworkError ||
    err instanceof TimeoutError ||
    err instanceof RequestAbortedError
  ) {
    return {kind: 'failure', errorKind: 'network'};
  }
  return {kind: 'failure', errorKind: 'server'};
}

export async function renewSubscription(
  body: RenewRequest,
): Promise<RenewResult> {
  try {
    const response = await http.service('payment').post(
      '/api/abonnement/renouveler',
      body,
      {auth: 'bearer'},
    );
    return mapRenewSubscription(
      response.status,
      response.body,
      response.bodyKind,
    );
  } catch (err) {
    return catchNet(err);
  }
}
