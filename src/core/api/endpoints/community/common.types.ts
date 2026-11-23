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
