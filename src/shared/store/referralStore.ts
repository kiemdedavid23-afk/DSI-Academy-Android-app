/**
 * Parrainage — store partagé (L3b + L3c / carte membre).
 * Lien d'invitation construit ici (R-LAY : pas de core/config dans features).
 */

import {fetchMemberReferral} from '@core/api/endpoints/payment/parrainage.api';
import type {MemberReferral} from '@core/api/endpoints/payment/parrainage.types';
import {resolveWebUrl} from '@core/config/serviceRegistry';
import {createResourceStore} from './createResourceStore';
import {storeRegistry} from './storeRegistry';

async function loadReferral(): Promise<MemberReferral> {
  const res = await fetchMemberReferral();
  if (res.kind === 'failure') {
    const err = new Error(
      res.notFound
        ? 'referral.accountNotFound'
        : res.message ?? 'referral.errorLoad',
    ) as Error & {notFound?: boolean};
    err.notFound = res.notFound;
    throw err;
  }
  return res.data;
}

export const referralStore = createResourceStore<MemberReferral>({
  name: 'referral',
  fetcher: loadReferral,
});

storeRegistry.register(referralStore);

/** Lien d'invitation : origine registre + /inscription?ref=code */
export function buildReferralInviteLink(code: string | null | undefined): string {
  const c = (code ?? '').trim();
  if (!c) {
    return '';
  }
  const path = `/inscription?ref=${encodeURIComponent(c)}`;
  return resolveWebUrl(path);
}

export function getReferralInviteLinkFromStore(): string {
  const data = referralStore.getState().data;
  return buildReferralInviteLink(data?.codeParrainagePersonnel);
}
