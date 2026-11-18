/**
 * Types communs Boutique + Marketplace (L8a).
 * Un seul modèle côté app : les adaptateurs `shop` et `marketplace` s'y
 * ramènent. Aucun texte affiché ici : les textes viennent de shared/i18n.
 */

export type CommerceSource = 'shop' | 'marketplace';

export type CommerceProduct = {
  source: CommerceSource;
  id: string;
  title: string;
  tagline: string | null;
  description: string | null;
  category: string | null;
  priceDsi: number;
  free: boolean;
  /** https uniquement ; null = placeholder côté écran. */
  coverUrl: string | null;
  badge: string | null;
  featured: boolean;
  hasAsset: boolean;
  sellerId: string | null;
  storeName: string | null;
  reviewAvg: number | null;
  reviewCount: number;
  salesCount: number;
  favoritesCount: number;
  /** Marketplace : date de création (ms), pour « Nouveautés ». Absent côté Boutique. */
  createdAt?: number | null;
};

export type CommerceCategory = {slug: string; count: number};

/** Statuts unifiés (décision P4) : en cours, payée, échouée, remboursée. */
export type CommerceOrderStatus = 'processing' | 'paid' | 'failed' | 'refunded';

export type CommerceOrderItem = {
  productId: string;
  title: string | null;
  qty: number | null;
};

export type CommerceOrder = {
  source: CommerceSource;
  id: string;
  items: CommerceOrderItem[];
  totalDsi: number;
  discountDsi: number;
  status: CommerceOrderStatus;
  rawStatus: string | null;
  paymentRef: string | null;
  failureReason: string | null;
  /** Millisecondes depuis 1970, ou null si illisible. */
  createdAt: number | null;
};

/** Résultat d'un achat ou d'une vérification : l'essentiel pour l'écran. */
export type CommerceOrderState = {
  orderId: string;
  status: CommerceOrderStatus;
  rawStatus: string | null;
  totalDsi: number | null;
  replay: boolean;
  note: string | null;
};

/**
 * Accès à un produit acheté. `webview` : lien du vendeur (Marketplace), ouvert
 * dans le WebView de l'app. `external` : URL temporaire d'un fichier
 * (Boutique), ouverte hors de l'app.
 */
export type CommerceAccess = {url: string; mode: 'webview' | 'external'};

export type AccessParams = {orderId: string; productId: string | null};

export type CommerceErrorKind =
  | 'network'
  | 'server'
  | 'notFound'
  | 'validation'
  | 'conflict'
  | 'unauthorized'
  | 'noProof'
  | 'forbidden'
  | 'accountDenied'
  | 'subscriptionInactive'
  | 'insufficientBalance'
  | 'paymentRefused'
  | 'indeterminate'
  | 'productUnavailable'
  | 'selfPurchase'
  | 'reconciliationPending'
  | 'entitlementUnavailable'
  | 'unavailable'
  | 'upstream'
  | 'invalidResponse';

/**
 * Échec commun. `code` est le code stable du Worker, jamais un texte à
 * afficher. `indeterminate` (Marketplace 502 à l'achat) impose de rejouer
 * avec la MÊME clé d'idempotence.
 */
export type CommerceFailure = {
  kind: 'failure';
  errorKind: CommerceErrorKind;
  status: number | null;
  code: string | null;
};

export type CommerceResult<T extends object> =
  | ({kind: 'success'} & T)
  | CommerceFailure;

/** Écriture sans donnée utile (favori ajouté ou retiré). */
export type CommerceWriteResult = {kind: 'success'} | CommerceFailure;

export type CatalogueParams = {category?: string; q?: string};

export type PurchaseParams = {
  productId: string;
  idempotencyKey: string;
  /** Boutique seulement (lot L8d) ; ignoré par la Marketplace. */
  promoCode?: string;
};

export type ProductsByIdsParams = {
  ids: string[];
  /** Produits déjà connus (catalogue en cache) : évite des appels. */
  known?: CommerceProduct[];
};
