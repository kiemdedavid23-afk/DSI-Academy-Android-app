/** Types propres au Worker Boutique (Contrat 1). */

export type ShopLibraryItem = {
  productId: string;
  title: string;
  category: string | null;
  /** Version réellement acquise ; jamais reconstruit par l'app. */
  assetFileId: string | null;
  hasAsset: boolean;
  grantedAt: number | null;
  orderId: string | null;
};

export type ShopReadUrl = {
  /** URL temporaire (300 s), https uniquement. */
  url: string;
};

/** Ligne du panier serveur (Contrat 1, B.1). Le prix vient toujours du catalogue. */
export type ShopCartLine = {productId: string; qty: number};

/** Aperçu indicatif d'un code promo : le quota n'est consommé qu'au checkout. */
export type ShopPromoPreview = {
  code: string;
  kind: 'percent' | 'other';
  value: number;
};
