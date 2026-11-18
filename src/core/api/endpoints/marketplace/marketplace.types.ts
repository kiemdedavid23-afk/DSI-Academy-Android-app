/** Types propres au Worker Marketplace (Rapport de branchement, 17/11/2026). */

export type MarketplaceDelivery = {
  orderId: string;
  title: string | null;
  /** Lien du vendeur, https uniquement, ouvert dans le WebView de l'app. */
  deliveryUrl: string;
};

/** Vendeur approuvé (GET /sellers, /sellers/:memberId). Rapport §4. */
export type MarketplaceSeller = {
  memberId: string;
  storeName: string;
  bio: string | null;
  rating: number | null;
  productsCount: number;
};

/** Avis anonyme d'un produit (GET /catalog/:id/reviews). Aucun auteur exposé. */
export type MarketplaceReview = {
  id: string;
  /** Entier de 1 à 5. */
  rating: number;
  comment: string | null;
  createdAt: number | null;
};
