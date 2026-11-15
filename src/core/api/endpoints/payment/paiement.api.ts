/**
 * Routes publiques paiement : réseaux + statut (tracking header).
 */

import {http} from '@core/network';
import {
  NetworkError,
  RequestAbortedError,
  TimeoutError,
} from '@core/network/errors';
import {mapPaymentNetworks, mapPaymentStatus} from './paiement.mapper';
import type {
  PaymentNetworksResult,
  PaymentStatusResult,
} from './paiement.types';

function catchNet(
  err: unknown,
): {kind: 'failure'; errorKind: 'network' | 'server'} {
  if (
    err instanceof NetworkError ||
    err instanceof TimeoutError ||
    err instanceof RequestAbortedError
  ) {
    return {kind: 'failure', errorKind: 'network'};
  }
  return {kind: 'failure', errorKind: 'server'};
}

export async function fetchPaymentNetworks(
  pays: string,
  type: 'inscription' | 'renouvellement',
): Promise<PaymentNetworksResult> {
  try {
    const response = await http.service('payment').get('/api/paiement/reseaux', {
      auth: 'none',
      query: {pays, type},
    });
    return mapPaymentNetworks(
      response.status,
      response.body,
      response.bodyKind,
    );
  } catch (err) {
    return catchNet(err);
  }
}

export async function fetchPaymentStatus(
  paymentTrackingToken: string,
): Promise<PaymentStatusResult> {
  try {
    const response = await http.service('payment').get('/api/paiement/statut', {
      auth: 'none',
      headers: {
        'X-Payment-Tracking-Token': paymentTrackingToken,
      },
    });
    return mapPaymentStatus(
      response.status,
      response.body,
      response.bodyKind,
    );
  } catch (err) {
    return catchNet(err);
  }
}
