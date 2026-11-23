/** Espaces (rapport §11.6). Dates en millisecondes. */

export type SpaceVisibility = 'public' | 'private';

export type SpaceSummary = {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  memberCount: number;
  joined: boolean;
  createdAt: number | null;
};

export type SpaceDetail = SpaceSummary & {
  visibility: SpaceVisibility;
  /** Présent seulement si le membre a rejoint l'espace. */
  conversationId: string | null;
};

export type NewSpaceInput = {name: string; description: string};

export type CreatedSpace = {id: string; conversationId: string | null};

/** `conversationId` est absent quand le membre était déjà dans l'espace : relire le détail. */
export type JoinedSpace = {conversationId: string | null; already: boolean};
