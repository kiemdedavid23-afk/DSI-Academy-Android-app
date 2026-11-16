/**
 * Sélections locales « Ma liste » (site selectionsStore). Vides par défaut,
 * purgées à la déconnexion.
 */

import {storageGet, storageSet} from '@core/storage';
import {sessionStore} from '@core/session';

const KEY = 'dsi_selections';

export type SelectionItem = {
  id: string;
  house: string;
  title: string;
  path: string;
  icon?: string | null;
  savedAt: number;
};

function sanitizeList(raw: unknown): SelectionItem[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: SelectionItem[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const e = item as Partial<SelectionItem>;
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

export const selectionsStore = {
  async list(): Promise<SelectionItem[]> {
    const raw = await storageGet<unknown>(KEY, []);
    return sanitizeList(raw)
      .slice()
      .sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
  },

  async has(id: string): Promise<boolean> {
    const current = await this.list();
    return current.some(x => x.id === id);
  },

  /** Ajoute ou retire une sélection. Renvoie true si le contenu est maintenant sélectionné. */
  async toggle(item: Omit<SelectionItem, 'savedAt'>): Promise<boolean> {
    const current = await this.list();
    if (current.some(x => x.id === item.id)) {
      await storageSet(
        KEY,
        current.filter(x => x.id !== item.id),
      );
      return false;
    }
    await storageSet(KEY, [{...item, savedAt: Date.now()}, ...current]);
    return true;
  },

  async clear(): Promise<void> {
    await storageSet(KEY, []);
  },
};

sessionStore.onSessionCleared(() => {
  void selectionsStore.clear();
});
