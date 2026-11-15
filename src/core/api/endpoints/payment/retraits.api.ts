import {http} from '@core/network';
import {
  NetworkError,
  RequestAbortedError,
  TimeoutError,
} from '@core/network/errors';
import {
  mapWithdrawRequest,
  mapWithdrawalHistoryDetail,
} from './retraits.mapper';
import type {
  WithdrawRequestBody,
  WithdrawRequestResult,
  WithdrawalHistoryDetailResult,
} from './retraits.types';

export async function requestWithdrawal(
  body: WithdrawRequestBody,
): Promise<WithdrawRequestResult> {
  try {
    const response = await http.service('payment').post(
      '/api/retrait/demander',
      body,
      {auth: 'bearer'},
    );
    return mapWithdrawRequest(
      response.status,
      response.body,
      response.bodyKind,
    );
  } catch (err) {
    if (
      err instanceof NetworkError ||
      err instanceof TimeoutError ||
      err instanceof RequestAbortedError
    ) {
      // Après envoi : résultat incertain
      return {kind: 'failure', errorKind: 'uncertain'};
    }
    return {kind: 'failure', errorKind: 'server'};
  }
}

export async function fetchWithdrawalDetail(
  idRetrait: string,
): Promise<WithdrawalHistoryDetailResult> {
  const id = encodeURIComponent(idRetrait);
  try {
    const response = await http
      .service('payment')
      .get(`/api/membre/retraits/${id}/historique`, {auth: 'bearer'});
    return mapWithdrawalHistoryDetail(
      response.status,
      response.body,
      response.bodyKind,
    );
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
