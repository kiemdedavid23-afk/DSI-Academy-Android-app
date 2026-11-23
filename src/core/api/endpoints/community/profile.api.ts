import {safeEnvelope} from '@core/network';
import {community, noProof} from './common.api';
import {mapProfileWrite} from './profile.mapper';
import type {
  AvatarFile,
  CreateProfileInput,
  UpdateProfileInput,
} from './profile.types';

/**
 * Profil et photo (rapport §11.1, §11.2, §12). Aucune de ces routes n'exige
 * d'abonnement actif. Les écritures ne sont jamais rejouées automatiquement.
 */

const AUTH = {auth: 'accessProof'} as const;
const UPLOAD_TIMEOUT_MS = 45_000;

export async function createCommunityProfile(input: CreateProfileInput) {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  const body: Record<string, unknown> = {displayName: input.displayName};
  if (input.pseudonym) {
    body.pseudonym = input.pseudonym;
  }
  if (typeof input.discoverable === 'boolean') {
    body.discoverable = input.discoverable;
  }
  const env = await safeEnvelope(
    community().post('/api/community/me/profile', body, AUTH),
  );
  return mapProfileWrite(env);
}

export async function updateCommunityProfile(input: UpdateProfileInput) {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  const body: Record<string, unknown> = {};
  if (input.displayName !== undefined) {
    body.displayName = input.displayName;
  }
  if (input.discoverable !== undefined) {
    body.discoverable = input.discoverable;
  }
  const env = await safeEnvelope(
    community().patch('/api/community/me/profile', body, AUTH),
  );
  return mapProfileWrite(env);
}

export async function updateCommunityPseudonym(pseudonym: string) {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  const env = await safeEnvelope(
    community().patch('/api/community/me/pseudonym', {pseudonym}, AUTH),
  );
  return mapProfileWrite(env);
}

/** Envoi ou remplacement : une seule route (rapport §12.2). Image déjà réduite. */
export async function uploadCommunityAvatar(file: AvatarFile) {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  const form = new FormData();
  form.append('file', file as unknown as Blob);
  const env = await safeEnvelope(
    community().postForm('/api/community/me/avatar', form, {
      ...AUTH,
      timeoutMs: UPLOAD_TIMEOUT_MS,
    }),
  );
  return mapProfileWrite(env);
}

export async function deleteCommunityAvatar() {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  const env = await safeEnvelope(
    community().delete('/api/community/me/avatar', AUTH),
  );
  return mapProfileWrite(env);
}
