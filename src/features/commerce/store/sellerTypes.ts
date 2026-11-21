/**
 * Types et constantes de l'espace vendeur, ré-exportés pour les écrans, les
 * composants et la logique (R-LAY-6 : seuls les stores importent @core/api).
 */

export {
  APPLICATION_FILE_KINDS,
  APPLICATION_FILE_MAX_BYTES,
  APPLICATION_LIMITS,
} from '@core/api/endpoints/marketplace/seller/seller.types';
export type {
  ApplicationFileKind,
  SellerApplication,
  SellerApplicationStatus,
  SellerMetric,
  SellerOverview,
  TrackKind,
} from '@core/api/endpoints/marketplace/seller/seller.types';
