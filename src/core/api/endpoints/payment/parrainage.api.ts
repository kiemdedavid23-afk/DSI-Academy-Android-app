import {http} from '@core/network';
import {
  NetworkError,
  RequestAbortedError,
  TimeoutError,
} from '@core/network/errors';
import {mapMemberReferral} from './parrainage.mapper';
import type {MemberReferralResult} from './parrainage.types';

function catchNet(err: unknown): MemberReferralResult {
  if (
    err instanceof NetworkError ||
    err instanceof TimeoutError ||
    err instanceof RequestAbortedError
  ) {
    return {kind: 'failure', errorKind: 'network'};
  }
  return {kind: 'failure', errorKind: 'server'};
}

export async function fetchMemberReferral(): Promise<MemberReferralResult> {
  try {
    const response = await http.service('payment').get('/api/membre/parrainage', {
      auth: 'bearer',
    });
    return mapMemberReferral(
      response.status,
      response.body,
      response.bodyKind,
    );
  } catch (err) {
    return catchNet(err);
  }
}
