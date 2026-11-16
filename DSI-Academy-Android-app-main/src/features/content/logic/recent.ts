/** Badge « Nouveau » et tri par nouveauté (site : createHousePages.jsx, seuil 14 jours). */

import type {Content} from '@core/utils/contentDisplay';

export const NEW_BADGE_THRESHOLD_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

function timestamp(createdAt: string | null): number {
  if (!createdAt) {
    return 0;
  }
  const ts = Date.parse(createdAt);
  return Number.isNaN(ts) ? 0 : ts;
}

export function isRecent(createdAt: string | null, now: number = Date.now()): boolean {
  const ts = timestamp(createdAt);
  return ts > 0 && now - ts < NEW_BADGE_THRESHOLD_DAYS * DAY_MS;
}

export function sortByNewest(items: Content[]): Content[] {
  return [...items].sort((a, b) => timestamp(b.createdAt) - timestamp(a.createdAt));
}
