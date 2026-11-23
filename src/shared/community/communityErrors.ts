/**
 * Codes d'erreur du Worker Communauté → clés de traduction (reprend le site :
 * houses/community/communityErrors.js et community-profile/communityProfileErrors.js).
 * Le texte `error` du serveur n'est jamais affiché (rapport §9.4).
 */

const P = 'communityApp.errors';
const PP = 'communityProfile.errors';

const SESSION_CODES = [
  'ACCESS_PROOF_MISSING',
  'ACCESS_PROOF_INVALID',
  'ACCESS_PROOF_EXPIRED',
];

const MAP: Record<string, string> = {
  SUBSCRIPTION_INACTIVE: `${P}.subscriptionInactive`,
  PROFILE_INCOMPLETE: `${P}.profileIncomplete`,
  VALIDATION: `${P}.validation`,
  NOT_FOUND: `${P}.notFound`,
  MEMBER_NOT_IN_COMMUNITY: `${P}.memberNotInCommunity`,
  ACCESS_DENIED: `${P}.accessDenied`,
  FORBIDDEN: `${P}.accessDenied`,
  CONFLICT: `${P}.conflict`,
  INVALID_STATE: `${P}.invalidState`,
  CONTACT_REQUIRED: `${P}.contactRequired`,
  INTERACTION_UNAVAILABLE: `${P}.interactionUnavailable`,
  MEDIA_MODE_UNSUPPORTED: `${P}.videoUnavailable`,
  CALL_QUOTA_EXCEEDED: `${P}.callQuota`,
  MEDIA_SERVICE_UNAVAILABLE: `${P}.callsUnavailable`,
  STORAGE_UNAVAILABLE: `${P}.filesUnavailable`,
  UPSTREAM: `${P}.filesUnavailable`,
  STORAGE_DELETE_FAILED: `${P}.filesUnavailable`,
  RATE_LIMITED: `${P}.rateLimited`,
  NETWORK_ERROR: `${P}.network`,
};

/**
 * Paiement émet une preuve déjà périmée quand l'abonnement est terminé (voulu) :
 * pour un membre connecté dont l'abonnement n'est pas actif, la vraie cause est
 * l'abonnement, pas la session (se reconnecter ne changerait rien).
 */
export function effectiveCommunityCode(
  code: string | null | undefined,
  subscriptionActive: boolean | null,
): string | null {
  if (code && SESSION_CODES.includes(code) && subscriptionActive === false) {
    return 'SUBSCRIPTION_INACTIVE';
  }
  return code ?? null;
}

export function isCommunitySessionCode(
  code: string | null | undefined,
  subscriptionActive: boolean | null,
): boolean {
  const c = effectiveCommunityCode(code, subscriptionActive);
  return c !== null && SESSION_CODES.includes(c);
}

export function isCommunitySubscriptionCode(
  code: string | null | undefined,
  subscriptionActive: boolean | null,
): boolean {
  return (
    effectiveCommunityCode(code, subscriptionActive) === 'SUBSCRIPTION_INACTIVE'
  );
}

export function communityErrorKey(
  code: string | null | undefined,
  subscriptionActive: boolean | null = null,
): string {
  const c = effectiveCommunityCode(code, subscriptionActive);
  if (c && SESSION_CODES.includes(c)) {
    return `${P}.sessionExpired`;
  }
  return (c && MAP[c]) || `${P}.generic`;
}

/** Erreurs de profil et de photo : clé selon le code et le champ (rapport §9.3). */
export function communityProfileErrorKey(
  code: string | null | undefined,
  field: string | null | undefined,
  subscriptionActive: boolean | null = null,
): string {
  const c = effectiveCommunityCode(code, subscriptionActive);
  if (c && SESSION_CODES.includes(c)) {
    return `${PP}.sessionExpired`;
  }
  switch (c) {
    case 'SUBSCRIPTION_INACTIVE':
      return `${PP}.subscriptionInactive`;
    case 'PROFILE_INCOMPLETE':
      return `${PP}.profileIncomplete`;
    case 'CONFLICT':
      return `${PP}.pseudonymTaken`;
    case 'VALIDATION':
      if (field === 'displayName') {
        return `${PP}.displayName`;
      }
      if (field === 'pseudonym') {
        return `${PP}.pseudonym`;
      }
      return `${PP}.validation`;
    case 'AVATAR_TOO_LARGE':
    case 'AVATAR_DIMENSIONS_TOO_LARGE':
      return `${PP}.avatarTooLarge`;
    case 'AVATAR_UNSUPPORTED_TYPE':
      return `${PP}.avatarUnsupported`;
    case 'AVATAR_UNREADABLE':
    case 'AVATAR_FILE_REQUIRED':
      return `${PP}.avatarUnreadable`;
    case 'STORAGE_UNAVAILABLE':
    case 'IMAGE_PROCESSING_UNAVAILABLE':
    case 'AVATAR_URL_INVALID':
    case 'AVATAR_URL_EXPIRED':
      return `${PP}.avatarUnavailable`;
    case 'RATE_LIMITED':
    case 'NETWORK_ERROR':
      return `${PP}.network`;
    default:
      return `${PP}.generic`;
  }
}
