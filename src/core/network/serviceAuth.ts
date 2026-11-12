/**
 * Mode d'authentification par défaut par service (R-NET-8).
 * L'appel peut le remplacer via options.auth.
 */

import type {AuthMode, ServiceId} from './types';

const DEFAULT_AUTH: Record<ServiceId, AuthMode> = {
  payment: 'none',
  content: 'none',
  shop: 'none',
  marketplace: 'none',
  community: 'accessProof',
  admin: 'none',
};

export function getDefaultAuth(service: ServiceId): AuthMode {
  return DEFAULT_AUTH[service];
}

export function resolveAuthMode(
  service: ServiceId,
  override?: AuthMode,
): AuthMode {
  return override ?? getDefaultAuth(service);
}
