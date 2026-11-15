import {http} from '@core/network';
import {
  NetworkError,
  RequestAbortedError,
  TimeoutError,
} from '@core/network/errors';
import {mapMoyensRetrait} from './moyensRetrait.mapper';
import type {MoyensRetraitResult} from './moyensRetrait.types';

function catchNet(err: unknown): MoyensRetraitResult {
  if (
    err instanceof NetworkError ||
    err instanceof TimeoutError ||
    err instanceof RequestAbortedError
  ) {
    return {kind: 'failure', errorKind: 'network'};
  }
  return {kind: 'failure', errorKind: 'server'};
}

export async function fetchMoyensRetrait(
  pays: string,
): Promise<MoyensRetraitResult> {
  try {
    const response = await http.service('payment').get(
      '/api/retrait/moyens-disponibles',
      {auth: 'none', query: {pays}},
    );
    return mapMoyensRetrait(response.status, response.body, response.bodyKind);
  } catch (err) {
    return catchNet(err);
  }
}
