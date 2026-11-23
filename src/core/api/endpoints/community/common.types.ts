/**
 * Worker Communauté : types communs (C1).
 * Source : RAPPORT-INTEGRATION-WORKER-COMMUNAUTE §8 et §9.
 */

export type CommunityErrorKind =
  | 'noProof'
  | 'unauthorized'
  | 'subscriptionInactive'
  | 'profileIncomplete'
  | 'rateLimited'
  | 'validation'
  | 'conflict'
  | 'notFound'
  | 'forbidden'
  | 'unavailable'
  | 'network'
  | 'invalidResponse'
  | 'server';

export type CommunityFailure = {
  kind: 'failure';
  errorKind: CommunityErrorKind;
  status: number | null;
  /** Code stable du Worker : seul critère de décision (jamais le texte `error`). */
  code: string | null;
  /** Champ du formulaire concerné (profil, photo), s'il est fourni. */
  field: string | null;
  retryAfterSeconds: number | null;
};

export type CommunityResult<T extends object> =
  | ({kind: 'success'} & T)
  | CommunityFailure;

export type CommunityWriteResult = {kind: 'success'} | CommunityFailure;

/** Membre tel que les autres le voient (liste, recherche, fiche, demande). */
export type CommunityPeer = {
  userId: string;
  displayName: string;
  pseudonym: string;
  /** Pseudonyme avec « @ », prêt à afficher. */
  publicPseudonym: string;
  /** Adresses signées et temporaires : toujours reprendre celles de la réponse. */
  avatarUrl: string | null;
  avatarThumbUrl: string | null;
  avatarUrlExpiresAt: number | null;
};
