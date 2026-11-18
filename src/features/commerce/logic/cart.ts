/**
 * Totaux du panier Boutique, calculés côté app pour l'AFFICHAGE seulement :
 * le Worker recalcule tout au checkout (l'app n'envoie jamais de prix).
 * Une ligne dont le produit n'est pas connu est comptée à part, jamais
 * chiffrée.
 */

import type {CommerceProduct} from '@core/api/endpoints/commerce/commerce.types';
import type {
  ShopCartLine,
  ShopPromoPreview,
} from '@core/api/endpoints/shop/shop.types';

export type CartTotals = {
  subtotalDsi: number;
  /** null si pas de code, ou si le type de remise n'est pas estimable. */
  discountDsi: number | null;
  totalDsi: number;
  /** Lignes sans produit connu : exclues du sous-total. */
  unknownCount: number;
  itemCount: number;
};

export function cartTotals(
  lines: ShopCartLine[],
  products: CommerceProduct[],
  promo: ShopPromoPreview | null,
): CartTotals {
  const byId = new Map(products.map(p => [p.id, p]));
  let subtotalDsi = 0;
  let unknownCount = 0;
  let itemCount = 0;
  for (const line of lines) {
    itemCount += line.qty;
    const product = byId.get(line.productId);
    if (product) {
      subtotalDsi += product.priceDsi * line.qty;
    } else {
      unknownCount += 1;
    }
  }
  let discountDsi: number | null = null;
  if (promo && promo.kind === 'percent') {
    discountDsi = Math.min(
      subtotalDsi,
      Math.floor((subtotalDsi * promo.value) / 100),
    );
  }
  return {
    subtotalDsi,
    discountDsi,
    totalDsi: subtotalDsi - (discountDsi ?? 0),
    unknownCount,
    itemCount,
  };
}
