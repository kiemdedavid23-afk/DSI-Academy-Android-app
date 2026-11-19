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

const MONTHS: Record<string, string[]> = {
  fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

/** « 16 novembre 2026 » / « November 16, 2026 » sans dépendre d'Intl (absent ou partiel sur Android). */
export function formatOrderDate(timestamp: number, lang: string): string {
  const d = new Date(timestamp);
  const code = lang.toLowerCase().startsWith('fr') ? 'fr' : 'en';
  const month = MONTHS[code][d.getMonth()];
  return code === 'fr'
    ? `${d.getDate()} ${month} ${d.getFullYear()}`
    : `${month} ${d.getDate()}, ${d.getFullYear()}`;
}
