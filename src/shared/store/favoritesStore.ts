/**
 * Favoris locaux (site favoritesStore). Vides par défaut, purgés à la déconnexion.
 */

import {storageGet, storageSet} from '@core/storage';
import {sessionStore} from '@core/session';

const KEY = 'dsi_favorites';

export type FavoriteItem = {
  id: string;
  house: string;
  title: string;
  path: string;
  icon?: string | null;
  savedAt: number;
};

function sanitizeList(raw: unknown): FavoriteItem[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: FavoriteItem[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const e = item as Partial<FavoriteItem>;
    if (typeof e.id !== 'string' || !e.id) {
      continue;
    }
    out.push({
      id: e.id,
      house: typeof e.house === 'string' ? e.house : 'library',
      title: typeof e.title === 'string' ? e.title : e.id,
      path: typeof e.path === 'string' ? e.path : '/',
      icon: typeof e.icon === 'string' ? e.icon : null,
      savedAt: typeof e.savedAt === 'number' ? e.savedAt : 0,
    });
  }
  return out;
}

export const favoritesStore = {
  async list(): Promise<FavoriteItem[]> {
    const raw = await storageGet<unknown>(KEY, []);
    return sanitizeList(raw)
      .slice()
      .sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
  },

  async remove(id: string): Promise<FavoriteItem[]> {
    const current = await this.list();
    const next = current.filter(x => x.id !== id);
    await storageSet(KEY, next);
    return next;
  },

  async clear(): Promise<void> {
    await storageSet(KEY, []);
  },
};

sessionStore.onSessionCleared(() => {
  void favoritesStore.clear();
});
