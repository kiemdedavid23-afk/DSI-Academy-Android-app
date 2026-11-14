/**
 * Motif de fin de session (affichage one-shot sur Login).
 */

export type SessionEndReason = 'loggedOut' | 'unauthorized' | 'expired';

let pendingReason: SessionEndReason | null = null;

export const sessionEndReason = {
  set(reason: SessionEndReason): void {
    pendingReason = reason;
  },

  /** Lit et consomme le motif (une seule fois). */
  consume(): SessionEndReason | null {
    const r = pendingReason;
    pendingReason = null;
    return r;
  },

  peek(): SessionEndReason | null {
    return pendingReason;
  },

  clear(): void {
    pendingReason = null;
  },
};
