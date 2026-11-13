/**
 * Registre central des stores purgeables.
 * S'abonne à core/session.onSessionCleared (R-LAY-1 : core n'importe pas shared).
 */

import {sessionStore} from '@core/session';

type Purgeable = {
  purge?: () => void;
  reset?: () => void;
};

const stores = new Set<Purgeable>();
let subscribed = false;

function ensureSubscription(): void {
  if (subscribed) {
    return;
  }
  subscribed = true;
  sessionStore.onSessionCleared(() => {
    storeRegistry.purgeAll();
  });
}

export const storeRegistry = {
  register(store: Purgeable): () => void {
    ensureSubscription();
    stores.add(store);
    return () => {
      stores.delete(store);
    };
  },

  purgeAll(): void {
    stores.forEach(store => {
      if (typeof store.purge === 'function') {
        store.purge();
      } else if (typeof store.reset === 'function') {
        store.reset();
      }
    });
  },

  /** Nombre de stores enregistrés (tests). */
  size(): number {
    return stores.size;
  },

  /** Vide le registre (tests uniquement). */
  clearRegistry(): void {
    stores.clear();
  },
};
