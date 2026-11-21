/**
 * Espace vendeur Marketplace (lot S1) : modèle côté app.
 * Source : docs/contrats/CONTRAT-ESPACE-VENDEUR.md. Montants en DSI (entiers).
 * Dates en millisecondes depuis 1970 (ou null si illisibles).
 * Aucun texte affiché ici : les textes viennent de shared/i18n.
 */

import type {
  CommerceFailure,
  CommerceResult,
} from '../../commerce/commerce.types';

export type SellerFailure = CommerceFailure;
export type SellerResult<T extends object> = CommerceResult<T>;
/** Écriture sans donnée utile. */
export type SellerWriteResult = {kind: 'success'} | SellerFailure;

export const SELLER_PERIODS = ['7d', '30d', '12m', 'all'] as const;
export type SellerPeriod = (typeof SELLER_PERIODS)[number];

export type SellerTrend = 'up' | 'down' | 'flat';

/**
 * Valeur + comparaison. `deltaPct` vaut null quand il n'y a pas de période
 * précédente ou qu'elle valait 0 : l'écran affiche alors « Nouveau » si
 * `trend` est `up`.
 */
export type SellerMetric = {
  value: number;
  previous: number | null;
  deltaPct: number | null;
  trend: SellerTrend;
};

/** Statut d'un vendeur approuvé un jour. */
export type SellerStatus = 'APPROVED' | 'SUSPENDED' | 'REVOKED';

/** Statut de candidature : `none` = rien déposé. */
export type SellerApplicationStatus =
  | 'none'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUSPENDED'
  | 'REVOKED';

export type SellerApplication = {
  status: SellerApplicationStatus;
  /** Motif (refus ou suspension), jamais affiché tel quel sans validation. */
  reason: string | null;
  storeName: string | null;
  slogan: string | null;
  description: string | null;
  submittedAt: number | null;
  reviewedAt: number | null;
};

export type SellerListingStatus =
  | 'draft'
  | 'pending_review'
  | 'published'
  | 'rejected'
  | 'suspended'
  | 'archived';

export type SellerOrderStatus = 'paid' | 'processing' | 'failed';

export type SellerVisibility = 'PUBLIC' | 'PRIVATE';

/** Identité de la boutique (aperçu et profil). */
export type SellerStore = {
  storeName: string;
  slogan: string | null;
  bio: string | null;
  /** https uniquement ; null = pas de logo. */
  logoUrl: string | null;
  status: SellerStatus;
  rating: number | null;
  ratingCount: number;
  storeSlug: string;
  /** Fournie par le Worker : l'app ne la fabrique jamais. */
  storeUrl: string;
  joinedAt: number | null;
};

export type SellerSuspension = {
  /** TEMPORARY ou PERMANENT, null si aucune suspension. */
  type: string | null;
  reason: string | null;
  endsAt: number | null;
  revokedAt: number | null;
};

export type SellerProfileCompletion = {
  percent: number;
  /** Clés manquantes (ex. `slogan`, `cover`, `firstSale`), dans l'ordre reçu. */
  missing: string[];
};

export type SellerBalance = {
  availableDsi: number;
  pendingDsi: number;
  asOf: number | null;
};

export type SellerListingCounts = {
  all: number;
  published: number;
  draft: number;
  pending_review: number;
  rejected: number;
  suspended: number;
  archived: number;
};

export type SellerListingSummary = {
  id: string;
  title: string;
  category: string | null;
  categoryLabel: string | null;
  priceDsi: number;
  free: boolean;
  status: SellerListingStatus;
  visibility: SellerVisibility;
  coverUrl: string | null;
  salesCount: number;
  revenueDsi: number;
  viewsCount: number;
  rejectionReason: string | null;
  createdAt: number | null;
  updatedAt: number | null;
};

export type SellerListingDetail = SellerListingSummary & {
  description: string | null;
  deliveryType: string | null;
  deliveryUrl: string | null;
  imageFileId: string | null;
};

export type SellerOrderItem = {
  id: string;
  listingId: string | null;
  listingTitle: string | null;
  coverUrl: string | null;
  /** « Prénom N. » ; null = acheteur inconnu (repli « Acheteur » côté écran). */
  buyerDisplayName: string | null;
  buyerCountry: string | null;
  priceDsi: number;
  commissionDsi: number;
  feesDsi: number;
  netSellerDsi: number;
  status: SellerOrderStatus;
  createdAt: number | null;
};

export type SellerOrderDetail = SellerOrderItem & {
  paidAt: number | null;
};

export type SellerPeriodInfo = {
  key: SellerPeriod;
  from: number | null;
  to: number | null;
};

export type SellerOverview = {
  seller: SellerStore;
  suspension: SellerSuspension;
  profileCompletion: SellerProfileCompletion;
  balance: SellerBalance;
  period: SellerPeriodInfo & {salesDsi: SellerMetric; orders: SellerMetric};
  counts: {
    products: SellerListingCounts;
    ordersTotal: number;
    ordersPaidTotal: number;
    revenueTotalDsi: number;
  };
  recentOrders: SellerOrderItem[];
  topListings: SellerTopListing[];
};

export type SellerTopListing = {
  id: string;
  title: string;
  coverUrl: string | null;
  salesCount: number;
  revenueDsi: number;
};

export type SellerProfileLimits = {
  storeNameMax: number;
  sloganMax: number;
  bioMax: number;
  logoMaxBytes: number;
};

export type SellerProfile = SellerStore & {limits: SellerProfileLimits};

export type SellerCategory = {slug: string; label: string};

export type SellerListingsQuery = {
  /** `all` (défaut, exclut archived) ou un statut. */
  status?: SellerListingStatus | 'all';
  q?: string;
  limit?: number;
  cursor?: string | null;
};

export type SellerListingsPage = {
  counts: SellerListingCounts;
  items: SellerListingSummary[];
  nextCursor: string | null;
};

export type SellerListingInput = {
  title?: string;
  description?: string;
  category?: string;
  priceDsi?: number;
  deliveryUrl?: string;
  visibility?: SellerVisibility;
  /** Identifiant renvoyé par l'envoi d'image (facultatif). */
  imageFileId?: string;
  /** Création seulement : `draft` ou `pending_review`, jamais `published`. */
  status?: 'draft' | 'pending_review';
};

export type SellerProfilePatch = {
  storeName?: string;
  slogan?: string;
  bio?: string;
};

export type SellerOrdersQuery = {
  period?: SellerPeriod;
  status?: SellerOrderStatus | 'all';
  limit?: number;
  cursor?: string | null;
};

export type SellerOrdersSummary = {
  revenueDsi: SellerMetric;
  netRevenueDsi: SellerMetric;
  paidOrders: SellerMetric;
  processingOrders: number;
  failedOrders: number;
};

export type SellerOrdersPage = {
  period: SellerPeriodInfo;
  summary: SellerOrdersSummary;
  items: SellerOrderItem[];
  nextCursor: string | null;
};

export type SellerLedgerEntry = {
  id: string;
  orderId: string | null;
  listingTitle: string | null;
  amountDsi: number;
  type: string | null;
  createdAt: number | null;
};

export type SellerEarnings = {
  availableDsi: number;
  pendingDsi: number;
  ledger: SellerLedgerEntry[];
  nextCursor: string | null;
};

export type SellerSuccessRate = {
  percent: number;
  attempted: number;
  succeeded: number;
  previousPercent: number | null;
  trend: SellerTrend;
};

export type SellerSeriesPoint = {
  /** `YYYY-MM-DD` (jour) ou `YYYY-MM` (mois). */
  date: string;
  netRevenueDsi: number;
  orders: number;
  uniqueVisitors: number;
  pageViews: number;
};

export type SellerAnalyticsListing = SellerTopListing & {
  views: number;
  conversionPct: number;
};

export type SellerAnalytics = {
  period: SellerPeriodInfo & {granularity: 'day' | 'month'};
  kpis: {
    netRevenueDsi: SellerMetric;
    uniqueVisitors: SellerMetric;
    pageViews: SellerMetric;
    successRate: SellerSuccessRate;
  };
  series: SellerSeriesPoint[];
  funnel: {
    storeViews: number;
    listingViews: number;
    ordersCreated: number;
    ordersPaid: number;
  };
  topListings: SellerAnalyticsListing[];
  byCountry: {country: string; orders: number; revenueDsi: number}[];
};

export type SellerReview = {
  id: string;
  listingId: string | null;
  listingTitle: string | null;
  rating: number;
  comment: string | null;
  authorDisplayName: string | null;
  createdAt: number | null;
};

export type SellerReviewsPage = {
  summary: {
    rating: number | null;
    ratingCount: number;
    /** Clés 1 à 5. */
    distribution: Record<'1' | '2' | '3' | '4' | '5', number>;
  };
  items: SellerReview[];
  nextCursor: string | null;
};

export type TrackKind = 'store_view' | 'listing_view';

// ─── Candidature (lot S3) ────────────────────────────────────────────────

export const APPLICATION_FILE_KINDS = [
  'logo',
  'id_front',
  'id_back',
  'id_selfie',
] as const;
export type ApplicationFileKind = (typeof APPLICATION_FILE_KINDS)[number];

/** Taille maximale d'un fichier de candidature (octets). */
export const APPLICATION_FILE_MAX_BYTES = 8 * 1024 * 1024;
export const APPLICATION_LIMITS = {
  storeName: 80,
  slogan: 120,
  description: 2000,
} as const;

/** Dépôt : les quatre fichiers sont déjà envoyés, on transmet leurs identifiants. */
export type SellerApplicationInput = {
  storeName: string;
  slogan: string;
  description: string;
  logoFileId: string;
  idDocumentFrontFileId: string;
  idDocumentBackFileId: string;
  idSelfieFileId: string;
};

export type SellerApplicationReceipt = {
  status: 'PENDING';
  submittedAt: number | null;
};
