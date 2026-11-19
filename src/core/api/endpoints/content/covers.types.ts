import type {ContentFailure, ContentType} from './common.types';

/** Couverture d'un contenu pour les éventails des bandeaux. */
export type CoverItem = {
  id: number;
  slug: string;
  title: string;
  /** Image à afficher : miniature 240 px si le Worker la fournit, sinon thumbnail_url. */
  imageUrl: string;
};

export type CoversParams = {
  type: ContentType;
  /** 1 à 24, 16 par défaut. */
  limit?: number;
};

export type CoversResult =
  | {kind: 'success'; items: CoverItem[]}
  | ContentFailure;
