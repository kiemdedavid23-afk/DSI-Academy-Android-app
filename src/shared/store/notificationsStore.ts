/**
 * Compteur de notifications non lues (badge cloche).
 * Aucune route Worker Paiement (§6.1) : reste à 0 jusqu'à l'étape Communauté.
 * Pas de données fictives (R-DATA-6).
 */

import {useSyncExternalStore} from 'react';

type Listener = () => void;

let unreadCount = 0;
const listeners = new Set<Listener>();

function emit(): void {
  listeners.forEach(l => l());
}

export const notificationsStore = {
  getUnreadCount(): number {
    return unreadCount;
  },

  /** Réservé aux étapes futures (communauté). */
  setUnreadCount(count: number): void {
    const next = Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
    if (next === unreadCount) {
      return;
    }
    unreadCount = next;
    emit();
  },

  reset(): void {
    if (unreadCount === 0) {
      return;
    }
    unreadCount = 0;
    emit();
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export function useUnreadNotifications(): number {
  return useSyncExternalStore(
    notificationsStore.subscribe,
    notificationsStore.getUnreadCount,
    notificationsStore.getUnreadCount,
  );
}
