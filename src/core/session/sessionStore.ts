/**
 * Session minimale pour L0d : présence uniquement, toujours absente.
 * Le jeton sécurisé et la connexion réelle arrivent à l'étape 1.
 *
 * core n'importe jamais shared (R-LAY-1). Les stores s'abonnent via
 * onSessionCleared pour purger leurs caches à la déconnexion.
 */

import {useSyncExternalStore} from 'react';

type SessionListener = () => void;

let hasSessionFlag = false;
const listeners = new Set<SessionListener>();
const clearedListeners = new Set<SessionListener>();

function emit(): void {
  listeners.forEach(listener => listener());
}

function emitCleared(): void {
  clearedListeners.forEach(listener => listener());
}

export const sessionStore = {
  /** True si une session membre est active. L0d : toujours false. */
  hasSession(): boolean {
    return hasSessionFlag;
  },

  /**
   * Active une session en mémoire (réservé aux tests et à l'étape 1).
   * L0d ne l'appelle jamais en production.
   */
  setSessionPresent(present: boolean): void {
    if (hasSessionFlag === present) {
      return;
    }
    hasSessionFlag = present;
    emit();
  },

  /**
   * Déconnexion : efface la session et notifie les abonnés (purge des stores).
   * Ne connaît aucun store (R-LAY-1).
   */
  clearSession(): void {
    hasSessionFlag = false;
    emit();
    emitCleared();
  },

  subscribe(listener: SessionListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /**
   * Abonnement à la fin de session (déconnexion ou 401 futur).
   * storeRegistry s'y branche pour appeler purgeAll().
   */
  onSessionCleared(listener: SessionListener): () => void {
    clearedListeners.add(listener);
    return () => {
      clearedListeners.delete(listener);
    };
  },
};

export function useHasSession(): boolean {
  return useSyncExternalStore(
    sessionStore.subscribe,
    sessionStore.hasSession,
    sessionStore.hasSession,
  );
}
