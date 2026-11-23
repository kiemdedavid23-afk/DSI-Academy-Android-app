/** Fil d'activité global (rapport §11.7) : `type` ∈ space.created, space.joined. */

export type ActivityType = 'space.created' | 'space.joined';

export type ActivityEvent = {
  id: string;
  type: ActivityType;
  actorId: string;
  /** Peut être vide : l'écran retombe sur le pseudonyme. */
  actorDisplayName: string;
  actorPseudonym: string;
  /** Millisecondes. */
  createdAt: number;
};
