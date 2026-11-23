import type {EnvelopeResult} from '@core/network';
import type {
  CommunityErrorKind,
  CommunityFailure,
  CommunityPeer,
  CommunityWriteResult,
} from './common.types';

export function failure(
  errorKind: CommunityErrorKind,
  status: number | null,
  code: string | null = null,
  field: string | null = null,
  retryAfterSeconds: number | null = null,
): CommunityFailure {
  return {kind: 'failure', errorKind, status, code, field, retryAfterSeconds};
}

/** Codes du Worker → nature de l'échec (prioritaires sur le statut HTTP). */
const CODE_KIND: Record<string, CommunityErrorKind> = {
  SUBSCRIPTION_INACTIVE: 'subscriptionInactive',
  PROFILE_INCOMPLETE: 'profileIncomplete',
  RATE_LIMITED: 'rateLimited',
  VALIDATION: 'validation',
  CONFLICT: 'conflict',
  INVALID_STATE: 'conflict',
  NOT_FOUND: 'notFound',
  MEMBER_NOT_IN_COMMUNITY: 'notFound',
  CONTACT_REQUIRED: 'forbidden',
  INTERACTION_UNAVAILABLE: 'forbidden',
  ACCESS_DENIED: 'forbidden',
  FORBIDDEN: 'forbidden',
  CALL_QUOTA_EXCEEDED: 'forbidden',
  MEDIA_SERVICE_UNAVAILABLE: 'unavailable',
  STORAGE_UNAVAILABLE: 'unavailable',
  IMAGE_PROCESSING_UNAVAILABLE: 'unavailable',
  UPSTREAM: 'unavailable',
  NETWORK_ERROR: 'network',
  INVALID_RESPONSE: 'invalidResponse',
};

export function failureFromEnvelope(env: EnvelopeResult): CommunityFailure {
  const {status, code} = env;
  const field = env.field ?? null;
  const retry = env.retryAfterSeconds ?? null;
  const make = (kind: CommunityErrorKind) =>
    failure(kind, status, code, field, retry);

  if (code && code.startsWith('ACCESS_PROOF')) {
    return make('unauthorized');
  }
  if (code && CODE_KIND[code]) {
    return make(CODE_KIND[code]);
  }
  if (status === 0) {
    return make('network');
  }
  if (status === 401) {
    return make('unauthorized');
  }
  if (status === 429) {
    return make('rateLimited');
  }
  if (status === 403) {
    return make('forbidden');
  }
  if (status === 404) {
    return make('notFound');
  }
  if (status === 409) {
    return make('conflict');
  }
  if (status === 422) {
    return make('validation');
  }
  if (status === 503 || status === 502) {
    return make('unavailable');
  }
  return make('server');
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function str(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

export function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Membre vu par les autres. `fallbackUserId` : identifiant de la relation si le profil abrégé n'en porte pas. */
export function mapPeer(
  raw: unknown,
  fallbackUserId: string | null = null,
): CommunityPeer | null {
  if (!isRecord(raw)) {
    return null;
  }
  const userId = str(raw.userId) ?? fallbackUserId;
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
    avatarUrl: str(raw.avatarUrl),
    avatarThumbUrl: str(raw.avatarThumbUrl),
    avatarUrlExpiresAt: num(raw.avatarUrlExpiresAt),
  };
}

/** Écriture sans contenu utile : seul le succès compte. */
export function mapWriteOk(env: EnvelopeResult): CommunityWriteResult {
  return env.success ? {kind: 'success'} : failureFromEnvelope(env);
}
