import type {CommunityFailure} from '@core/api/endpoints/community/common.types';
import {sessionStore} from '@core/session';
import {communityErrorKey} from '@shared/community';

/** Clé de traduction du message d'une erreur du Worker (jamais le texte serveur). */
export function failureKey(f: CommunityFailure): string {
  const code =
    f.code ??
    (f.errorKind === 'noProof'
      ? 'ACCESS_PROOF_MISSING'
      : f.errorKind === 'network'
      ? 'NETWORK_ERROR'
      : null);
  return communityErrorKey(code, sessionStore.getSession()?.subscriptionActive ?? null);
}
