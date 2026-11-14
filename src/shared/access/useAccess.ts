/**
 * Hook mince : lit la session et applique canAccessResource.
 * L1c ne bloque aucun écran avec ce hook.
 */

import {useSyncExternalStore} from 'react';
import {sessionStore} from '@core/session';
import {
  canAccessResource,
  type AccessGuardOptions,
  type AccessGuardResult,
} from './accessGuard';

export function useAccess(
  options: Pick<AccessGuardOptions, 'requireSubscription' | 'requireProof'> = {},
): AccessGuardResult {
  const session = useSyncExternalStore(
    sessionStore.subscribe,
    sessionStore.getSession,
    sessionStore.getSession,
  );
  return canAccessResource({
    subscriptionActive: session?.subscriptionActive ?? false,
    accessProof: session?.accessProof ?? null,
    requireSubscription: options.requireSubscription,
    requireProof: options.requireProof,
  });
}
