import {http} from '@core/network';
import {
  NetworkError,
  RequestAbortedError,
  TimeoutError,
} from '@core/network/errors';
import {mapMemberPayments} from './paiements.mapper';
import type {MemberPaymentsResult} from './paiements.types';

function catchNet(err: unknown): MemberPaymentsResult {
  if (
    err instanceof NetworkError ||
    err instanceof TimeoutError ||
    err instanceof RequestAbortedError
  ) {
    return {kind: 'failure', errorKind: 'network'};
  }
  return {kind: 'failure', errorKind: 'server'};
}

/** limit fixe = 20 (site). */
export async function fetchMemberPayments(
  page: number,
): Promise<MemberPaymentsResult> {
  const p = Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
  try {
    const response = await http.service('payment').get('/api/membre/paiements', {
      auth: 'bearer',
      query: {page: p, limit: 20},
    });
    return mapMemberPayments(
      response.status,
      response.body,
      response.bodyKind,
    );
  } catch (err) {
    return catchNet(err);
  }
}
