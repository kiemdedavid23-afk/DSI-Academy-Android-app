import type {ContentFailure, ContentType} from './common.types';

/** Résumé de contenu dans les réponses de parties (sans compteurs ni metadata). */
export type ContentSummary = {
  id: number;
  uid: string | null;
  type: ContentType;
  slug: string;
  title: string;
  description: string | null;
  language: string;
  level: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
};

/** Partie directe d'une œuvre (chapitre, leçon, épisode, module…). */
export type PartItem = {
  /** Rang d'affichage, à partir de 1. */
  index: number;
  linkId: number;
  /** module, lesson, chapter, episode, part… (texte libre côté Worker). */
  kind: string;
  position: number;
  depth: number;
  content: ContentSummary;
  /** Nombre de sous-parties actives. */
  partsCount: number;
  durationSeconds: number | null;
  durationComplete: boolean;
  /** Seulement pour /parts/tree : sous-parties (feuille : []). */
  children: PartItem[];
};

export type PartsOverview = {
  work: ContentSummary;
  /** false : le contenu n'est pas une œuvre composée (items vide, pas d'erreur). */
  isWork: boolean;
  totalParts: number;
  totalDurationSeconds: number | null;
  /** false : au moins une partie sans durée connue. */
  durationComplete: boolean;
  unknownDurationParts: number;
  items: PartItem[];
};

export type PartsResult =
  | {kind: 'success'; overview: PartsOverview}
  | ContentFailure;

export type NavigationScope = 'parent' | 'work';

export type PathEntry = {
  id: number;
  uid: string | null;
  type: ContentType;
  slug: string;
  title: string;
};

export type NavigationNeighbor = {
  linkId: number;
  kind: string;
  position: number;
  content: ContentSummary;
  partsCount: number;
};

/** Place d'une partie dans son œuvre et voisins (GET /content/:id/navigation). */
export type PartNavigation = {
  content: ContentSummary;
  work: ContentSummary | null;
  parent: ContentSummary | null;
  /** De l'œuvre racine au parent direct (le contenu lui-même n'y figure pas). */
  path: PathEntry[];
  kind: string;
  position: number;
  depth: number;
  scope: NavigationScope;
  /** Rang et total : frères (scope parent) ou feuilles de l'œuvre (scope work). */
  index: number;
  total: number;
  previous: NavigationNeighbor | null;
  next: NavigationNeighbor | null;
};

export type NavigationResult =
  | {kind: 'success'; navigation: PartNavigation}
  | ContentFailure;
