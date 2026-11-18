/**
 * Types communs au Worker Contenu (docs/contrats : API.md).
 * Le contrat est la base : mode LIEN unique, aucun relais de fichier.
 */

export type ContentType = 'book' | 'video' | 'audio' | 'training';

export const CONTENT_TYPES: readonly ContentType[] = [
  'book',
  'video',
  'audio',
  'training',
];

export type EditorialStatus = 'draft' | 'published' | 'archived';
export type ModerationStatus = 'active' | string;

/** Contenu tel que renvoyé par le Worker (champs publics uniquement). */
export type Content = {
  id: number;
  uid: string | null;
  type: ContentType;
  slug: string;
  title: string;
  description: string | null;
  language: string;
  categoryId: number | null;
  editorialStatus: string;
  moderationStatus: string;
  metadata: Record<string, unknown>;
  level: string | null;
  durationSeconds: number | null;
  viewCount: number;
  /** Absent des anciens Workers : 0. */
  likeCount: number;
  /** Nombre de parties actives (œuvre composée), 0 sinon. */
  partsCount: number;
  /** Présent seulement dans la fiche (GET /content/:id) : null ailleurs. */
  isPart: boolean | null;
  thumbnailUrl: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ContentErrorKind =
  | 'network'
  | 'server'
  | 'notFound'
  | 'validation'
  | 'unauthorized'
  | 'forbidden'
  | 'unavailable'
  | 'providerLink'
  | 'noProof'
  | 'invalidResponse'
  | 'unsupportedMode';

/**
 * Échec commun. `code` est le code stable du Worker (partie avant « — »),
 * jamais un texte à afficher : les textes viennent de shared/i18n.
 */
export type ContentFailure = {
  kind: 'failure';
  errorKind: ContentErrorKind;
  status: number | null;
  code: string | null;
};
