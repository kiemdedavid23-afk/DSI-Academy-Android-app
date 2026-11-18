/** Types propres au Worker Marketplace (Rapport de branchement, 17/11/2026). */

export type MarketplaceDelivery = {
  orderId: string;
  title: string | null;
  /** Lien du vendeur, https uniquement, ouvert dans le WebView de l'app. */
  deliveryUrl: string;
};
