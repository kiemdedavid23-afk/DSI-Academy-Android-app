export type CreateProfileInput = {
  displayName: string;
  /** Facultatif : absent, le Worker en génère un à partir du nom. */
  pseudonym?: string;
  discoverable?: boolean;
};

export type UpdateProfileInput = {
  displayName?: string;
  discoverable?: boolean;
};

/** Fichier réduit, prêt à partir en multipart (objet fichier React Native). */
export type AvatarFile = {uri: string; name: string; type: string};
