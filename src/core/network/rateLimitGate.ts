/**
 * Limitation de débit par service (R-NET-11).
 * Reprend la logique du site (community/rateLimitGate.js) indexée par service.
 * Ne bloque pas les appels : les stores consultent isRateLimited avant de sonder.
 */

import type {ServiceId} from './types';

const blockedUntilByService: Partial<Record<ServiceId, number>> = {};

/**
 * Signale un 429 / RATE_LIMITED pour un service.
 * @param seconds délai ; si absent ou invalide → 30 s
 */
export function notifyRateLimited(
  service: ServiceId,
  seconds?: number | null,
): void {
  const n = Number(seconds);
  const safe =
    Number.isFinite(n) && n > 0 ? n : 30;
  const until = Date.now() + safe * 1000;
  const current = blockedUntilByService[service] ?? 0;
  blockedUntilByService[service] = Math.max(current, until);
}

export function isRateLimited(service: ServiceId): boolean {
  const until = blockedUntilByService[service] ?? 0;
  return Date.now() < until;
}

/** Millisecondes restantes avant disponibilité (0 si libre). */
export function msUntilAvailable(service: ServiceId): number {
  const until = blockedUntilByService[service] ?? 0;
  return Math.max(0, until - Date.now());
}

/** Purge toutes les limitations (déconnexion / tests). */
export function resetRateLimits(): void {
  for (const key of Object.keys(blockedUntilByService) as ServiceId[]) {
    delete blockedUntilByService[key];
  }
}
