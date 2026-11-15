import type {ContentFailure, ContentType} from './common.types';

/**
 * Lien de lecture direct (mode LIEN unique, PROVIDERS.md). L'adresse sert à
 * l'app pour lire en direct chez la source ; elle n'est jamais affichée,
 * journalisée ni conservée au-delà de la lecture.
 */
export type DeliveryLink = {
  contentId: number;
  contentType: ContentType;
  assetId: number;
  providerId: string;
  format: string;
  url: string;
  /** Présents seulement pour Google Drive. */
  mimeType: string | null;
  sizeBytes: number | null;
};

export type DeliveryResult =
  | {kind: 'success'; link: DeliveryLink}
  | ContentFailure;
