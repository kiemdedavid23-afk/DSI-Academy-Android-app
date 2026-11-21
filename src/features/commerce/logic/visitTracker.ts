/**
 * Suivi des visites de la Marketplace (lot S2, contrat §9).
 * - Clé visiteur : UUID v4 générée une fois, conservée localement, jamais liée
 *   à un compte. Elle n'est lue que pour ce suivi.
 * - Fire-and-forget : ne bloque jamais un écran, n'affiche jamais d'erreur,
 *   n'envoie rien hors-ligne (aucune file d'attente).
 * - Une même cible n'est pas renvoyée avant 30 minutes (comme le Worker).
 */

import {trackVisit} from '@core/api/endpoints/marketplace/seller/seller.api';
import type {TrackKind} from '@core/api/endpoints/marketplace/seller/seller.types';
import {storageGet, storageSet} from '@core/storage';
import {connectivityStore} from '@shared/store/connectivityStore';

export const VISITOR_KEY_STORAGE = 'dsi_visitor_key';
export const TRACK_DEDUP_MS = 30 * 60 * 1000;

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type CryptoLike = {
  randomUUID?: () => string;
  getRandomValues?: (a: Uint8Array) => Uint8Array;
};

export function isVisitorKey(value: unknown): value is string {
  return typeof value === 'string' && UUID_V4.test(value);
}

export function createVisitorKey(): string {
  const c = (globalThis as {crypto?: CryptoLike}).crypto;
  if (c && typeof c.randomUUID === 'function') {
    const id = c.randomUUID();
    if (isVisitorKey(id)) {
      return id;
    }
  }
  const bytes = new Uint8Array(16);
  if (c && typeof c.getRandomValues === 'function') {
    c.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

let cachedKey: string | null = null;
const lastSent = new Map<string, number>();

/** Lit la clé, la crée si elle manque ou est invalide. */
export async function getVisitorKey(): Promise<string> {
  if (cachedKey) {
    return cachedKey;
  }
  const stored = await storageGet<unknown>(VISITOR_KEY_STORAGE, null);
  if (isVisitorKey(stored)) {
    cachedKey = stored;
    return stored;
  }
  const fresh = createVisitorKey();
  cachedKey = fresh;
  await storageSet(VISITOR_KEY_STORAGE, fresh);
  return fresh;
}

/** Réinitialise la mémoire du module (tests). */
export function resetVisitTrackerForTests(): void {
  cachedKey = null;
  lastSent.clear();
}

export async function trackMarketplaceVisit(
  kind: TrackKind,
  targetId: string,
  now: number = Date.now(),
): Promise<void> {
  try {
    if (!targetId || connectivityStore.getStatus() === 'offline') {
      return;
    }
    const dedupKey = `${kind}:${targetId}`;
    const previous = lastSent.get(dedupKey);
    if (previous !== undefined && now - previous < TRACK_DEDUP_MS) {
      return;
    }
    lastSent.set(dedupKey, now);
    const visitorKey = await getVisitorKey();
    await trackVisit(kind, targetId, visitorKey);
  } catch {
    // Jamais d'erreur visible pour un suivi.
  }
}

/** Fiche produit (targetId = identifiant du produit). */
export function trackListingView(listingId: string): void {
  void trackMarketplaceVisit('listing_view', listingId);
}

/** Boutique (targetId = storeSlug). À brancher quand le slug est exposé. */
export function trackStoreView(storeSlug: string): void {
  void trackMarketplaceVisit('store_view', storeSlug);
}
