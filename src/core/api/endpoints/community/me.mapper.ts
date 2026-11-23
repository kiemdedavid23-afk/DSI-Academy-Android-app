import type {EnvelopeResult} from '@core/network';
import {failure, failureFromEnvelope, isRecord, num, str} from './common.mapper';
import type {CommunityResult} from './common.types';
import type {CommunityMe, CommunityProfile} from './me.types';

export function mapCommunityProfile(raw: unknown): CommunityProfile | null {
  if (!isRecord(raw)) {
    return null;
  }
  const userId = str(raw.userId);
  const displayName = str(raw.displayName);
  const pseudonym = str(raw.pseudonym);
  if (!userId || displayName === null || !pseudonym) {
    return null;
  }
  return {
    userId,
    displayName,
    pseudonym,
    publicPseudonym: str(raw.publicPseudonym) ?? `@${pseudonym}`,
    avatarFileId: str(raw.avatarFileId),
    discoverable: raw.discoverable !== false,
    communityStatus: str(raw.communityStatus) ?? 'ACTIVE',
    createdAt: num(raw.createdAt),
    updatedAt: num(raw.updatedAt),
    avatarUrl: str(raw.avatarUrl),
    avatarThumbUrl: str(raw.avatarThumbUrl),
    avatarUrlExpiresAt: num(raw.avatarUrlExpiresAt),
  };
}

/** GET /me : fonctionne sans abonnement actif et sans profil (rapport §10.2). */
export function mapCommunityMe(
  env: EnvelopeResult,
): CommunityResult<{me: CommunityMe}> {
  if (!env.success) {
    return failureFromEnvelope(env);
  }
  const data = env.data;
  if (!isRecord(data) || typeof data.needsProfile !== 'boolean') {
    return failure('invalidResponse', env.status, 'INVALID_RESPONSE');
  }
  const profile = mapCommunityProfile(data.profile);
  if (data.needsProfile === false && profile === null) {
    return failure('invalidResponse', env.status, 'INVALID_RESPONSE');
  }
  return {
    kind: 'success',
    me: {
      userId: str(data.userId) ?? profile?.userId ?? '',
      needsProfile: data.needsProfile,
      profile: data.needsProfile ? null : profile,
      communityStatus: str(data.communityStatus) ?? 'INCOMPLETE',
    },
  };
}
