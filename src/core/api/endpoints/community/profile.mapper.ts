import type {EnvelopeResult} from '@core/network';
import {failure, failureFromEnvelope, isRecord} from './common.mapper';
import type {CommunityResult} from './common.types';
import {mapCommunityProfile} from './me.mapper';
import type {CommunityProfile} from './me.types';

/**
 * Toutes les routes de profil et de photo répondent `{ profile, … }`
 * (création 201 ou 200 « existing », modification, photo envoyée ou supprimée).
 * L'app affiche toujours le profil de la réponse (nouvelles adresses de photo).
 */
export function mapProfileWrite(
  env: EnvelopeResult,
): CommunityResult<{profile: CommunityProfile}> {
  if (!env.success) {
    return failureFromEnvelope(env);
  }
  const profile = isRecord(env.data) ? mapCommunityProfile(env.data.profile) : null;
  if (!profile) {
    return failure('invalidResponse', env.status, 'INVALID_RESPONSE');
  }
  return {kind: 'success', profile};
}
