/**
 * Fournisseurs d'authentification branchés par le module de session (L1a).
 * Par défaut : null / no-op.
 */

import type {HttpAuthConfig, UnauthorizedContext} from './types';

const defaultConfig: HttpAuthConfig = {
  getBearerToken: () => null,
  getAccessProof: () => null,
  onUnauthorized: (_ctx: UnauthorizedContext) => {},
};

let config: HttpAuthConfig = {...defaultConfig};

/**
 * Configure les fournisseurs de jeton / preuve et le callback 401.
 * Appelé une fois par le module de session.
 */
export function configureHttpAuth(partial: Partial<HttpAuthConfig>): void {
  config = {
    getBearerToken: partial.getBearerToken ?? config.getBearerToken,
    getAccessProof: partial.getAccessProof ?? config.getAccessProof,
    onUnauthorized: partial.onUnauthorized ?? config.onUnauthorized,
  };
}

/** Accès interne au client HTTP. */
export function getHttpAuthConfig(): HttpAuthConfig {
  return config;
}

/** Remet les défauts (tests / déconnexion). */
export function resetHttpAuth(): void {
  config = {...defaultConfig};
}
