/**
 * Endpoints membre authentifié — service payment.
 * Auth Bearer via http client (session).
 */

import {http} from '@core/network';
import {
  NetworkError,
  RequestAbortedError,
  TimeoutError,
} from '@core/network/errors';
import {
  mapMemberBalance,
  mapMemberProfile,
  mapMemberSubscription,
  mapMemberWithdrawals,
} from './membre.mapper';
import type {
  MemberBalanceResult,
  MemberProfileResult,
  MemberSubscriptionResult,
  MemberWithdrawalsResult,
} from './membre.types';

function networkOrServer(): {kind: 'failure'; errorKind: 'network' | 'server'} {
  return {kind: 'failure', errorKind: 'server'};
}

function catchNetwork(err: unknown): {kind: 'failure'; errorKind: 'network' | 'server'} {
  if (
    err instanceof NetworkError ||
    err instanceof TimeoutError ||
    err instanceof RequestAbortedError
  ) {
    return {kind: 'failure', errorKind: 'network'};
  }
  return {kind: 'failure', errorKind: 'server'};
}

export async function fetchMemberProfile(): Promise<MemberProfileResult> {
  try {
    const response = await http.service('payment').get('/api/membre/profil', {
      auth: 'bearer',
    });
    return mapMemberProfile(response.status, response.body, response.bodyKind);
  } catch (err) {
    return catchNetwork(err);
  }
}

export async function fetchMemberBalance(): Promise<MemberBalanceResult> {
  try {
    const response = await http.service('payment').get('/api/membre/solde', {
      auth: 'bearer',
    });
    return mapMemberBalance(response.status, response.body, response.bodyKind);
  } catch (err) {
    return catchNetwork(err);
  }
}

export async function fetchMemberSubscription(): Promise<MemberSubscriptionResult> {
  try {
    const response = await http.service('payment').get('/api/membre/abonnement', {
      auth: 'bearer',
    });
    return mapMemberSubscription(response.status, response.body, response.bodyKind);
  } catch (err) {
    return catchNetwork(err);
  }
}

export async function fetchMemberWithdrawals(): Promise<MemberWithdrawalsResult> {
  try {
    const response = await http.service('payment').get('/api/membre/retraits', {
      auth: 'bearer',
    });
    return mapMemberWithdrawals(response.status, response.body, response.bodyKind);
  } catch (err) {
    return catchNetwork(err);
  }
}
