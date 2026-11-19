/**
 * Mes achats et Historique (Marketplace et Boutique). Calcul pur, sans réseau.
 *  · Mes achats : les commandes payées ou en cours de paiement.
 *  · Historique : toutes les commandes, y compris échouées ou remboursées.
 */

import type {CommerceOrder} from '../store/commerceTypes';

type CommerceOrderStatus = CommerceOrder['status'];

export type OrdersMode = 'purchases' | 'history';
export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral';

export function ordersFor(mode: OrdersMode, orders: CommerceOrder[]): CommerceOrder[] {
  return mode === 'history'
    ? orders
    : orders.filter(o => o.status === 'paid' || o.status === 'processing');
}

/** Couleur de l'étiquette : payé vert, en attente jaune, échoué rouge, remboursé neutre. */
export function statusTone(status: CommerceOrderStatus): StatusTone {
  switch (status) {
    case 'paid':
      return 'success';
    case 'processing':
      return 'warning';
    case 'failed':
      return 'danger';
    default:
      return 'neutral';
  }
}

/** Titre de la commande : le premier produit, et « + N » pour les suivants. */
export function orderTitle(order: CommerceOrder): {title: string | null; more: number} {
  const first = order.items[0]?.title ?? null;
  return {title: first, more: Math.max(0, order.items.length - 1)};
}
