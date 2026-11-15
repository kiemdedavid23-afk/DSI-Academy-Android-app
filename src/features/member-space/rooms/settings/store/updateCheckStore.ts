/**
 * Vérification de mise à jour de l'application (Paramètres > Aide).
 * L'appel à core/api vit ici (R-LAY-6) ; la vue lit l'état et déclenche check().
 */

import {checkAppRelease} from '@core/api/endpoints/notifications/notifications.api';

type Listener = () => void;

export type UpdateCheckOutcome =
  | {kind: 'error'}
  | {kind: 'upToDate'}
  | {kind: 'available'; version: string};

export type UpdateCheckState = {
  checking: boolean;
  outcome: UpdateCheckOutcome | null;
};

let state: UpdateCheckState = {checking: false, outcome: null};
const listeners = new Set<Listener>();

function set(patch: Partial<UpdateCheckState>): void {
  state = {...state, ...patch};
  listeners.forEach(l => l());
}

export const updateCheckStore = {
  getState: (): UpdateCheckState => state,

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /** Remet à zéro (sortie de la vue). */
  reset(): void {
    set({checking: false, outcome: null});
  },

  async check(): Promise<void> {
    if (state.checking) {
      return;
    }
    set({checking: true, outcome: null});
    const res = await checkAppRelease();
    if (res.kind === 'failure') {
      set({checking: false, outcome: {kind: 'error'}});
      return;
    }
    if (res.updateAvailable) {
      set({
        checking: false,
        outcome: {
          kind: 'available',
          version: res.version || res.latestVersion || '',
        },
      });
      return;
    }
    set({checking: false, outcome: {kind: 'upToDate'}});
  },
};
