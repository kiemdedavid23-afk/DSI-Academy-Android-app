import type {ContentFailure} from './common.types';

/** Asset, vue publique : sans reference ni provider_id (API.md). */
export type Asset = {
  id: number;
  contentId: number;
  format: string;
  mimeType: string | null;
  sizeBytes: number | null;
  durationSeconds: number | null;
  quality: string | null;
  language: string | null;
  /** download_allowed ET capacité download du provider (inutilisé : streaming seul). */
  downloadable: boolean;
  status: string;
  priority: number;
  createdAt: string | null;
  updatedAt: string | null;
};

export type AssetsResult =
  | {kind: 'success'; items: Asset[]}
  | ContentFailure;

export type AssetResult = {kind: 'success'; item: Asset} | ContentFailure;
