/**
 * Dernier identifiant saisi à la connexion (pending_payment) — mémoire process.
 * Jamais persisté. Effacé en fin de parcours ou à la déconnexion.
 */

let lastIdentifier: string | null = null;

export const lastLoginIdentifier = {
  set(value: string): void {
    const trimmed = value.trim();
    lastIdentifier = trimmed.length > 0 ? trimmed : null;
  },

  get(): string | null {
    return lastIdentifier;
  },

  clear(): void {
    lastIdentifier = null;
  },
};
