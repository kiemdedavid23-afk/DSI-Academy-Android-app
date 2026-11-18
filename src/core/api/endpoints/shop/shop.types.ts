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
