/**
 * Résultat d'un achat : redirection automatique et lignes du reçu.
 * Calcul pur, sans réseau. Les données viennent des deux Workers :
 *  · Marketplace : `delivery` donne le lien du vendeur (https) ;
 *  · Boutique : pas de lien dans le checkout ; un produit se lit par une adresse
 *    temporaire (bibliothèque), un panier mène à la bibliothèque.
 */

import type {CommerceOrderState, CommerceSource} from '../store/commerceTypes';

/** Attente avant la redirection automatique. */
export const REDIRECT_SECONDS = 5;
/** Vérifications automatiques d'un paiement en attente (une toutes les 5 s). */
export const AUTO_VERIFY_MAX = 6;
export const AUTO_VERIFY_DELAY_MS = 5000;

export type RedirectTarget = 'access' | 'library' | 'purchases';

/** Où mène la redirection : le produit, la bibliothèque (panier Boutique) ou Mes achats. */
export function redirectTarget(
  source: CommerceSource,
  cart: boolean,
  hasLibrary: boolean,
): RedirectTarget {
  if (source === 'shop' && cart) {
    return hasLibrary ? 'library' : 'purchases';
  }
  return 'access';
}

export type ReceiptRow = {
  id: 'orderId' | 'paymentRef' | 'operationId' | 'subtotal' | 'discount' | 'promo' | 'total';
  kind: 'text' | 'dsi';
  value: string | number;
  /** Remise : montant retiré, affiché avec un signe moins. */
  negative?: boolean;
};

/** Lignes du reçu, dans l'ordre ; ce qu'un Worker n'a pas envoyé n'apparaît pas. */
export function receiptRows(order: CommerceOrderState): ReceiptRow[] {
  const rows: ReceiptRow[] = [{id: 'orderId', kind: 'text', value: order.orderId}];
  if (order.paymentRef) {
    rows.push({id: 'paymentRef', kind: 'text', value: order.paymentRef});
  }
  if (order.operationId) {
    rows.push({id: 'operationId', kind: 'text', value: order.operationId});
  }
  const discount = order.discountDsi ?? 0;
  if (discount > 0 && order.subtotalDsi != null) {
    rows.push({id: 'subtotal', kind: 'dsi', value: order.subtotalDsi});
  }
  if (discount > 0) {
    rows.push({id: 'discount', kind: 'dsi', value: discount, negative: true});
  }
  if (order.promoCode) {
    rows.push({id: 'promo', kind: 'text', value: order.promoCode});
  }
  if (order.totalDsi != null) {
    rows.push({id: 'total', kind: 'dsi', value: order.totalDsi});
  }
  return rows;
}

/** Secondes restantes après une seconde écoulée (jamais sous zéro). */
export function nextCountdown(left: number): number {
  return Math.max(0, left - 1);
}
