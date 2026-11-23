export type CommunityProfile = {
  userId: string;
  displayName: string;
  pseudonym: string;
  /** Pseudonyme avec « @ », prêt à afficher. */
  publicPseudonym: string;
  avatarFileId: string | null;
  discoverable: boolean;
  communityStatus: string;
  /** Millisecondes (époque Unix). */
  createdAt: number | null;
  updatedAt: number | null;
  /** Adresses signées et temporaires : toujours reprendre celles de la réponse. */
  avatarUrl: string | null;
  avatarThumbUrl: string | null;
  avatarUrlExpiresAt: number | null;
};

export type CommunityMe = {
  userId: string;
  needsProfile: boolean;
  profile: CommunityProfile | null;
  communityStatus: string;
};
