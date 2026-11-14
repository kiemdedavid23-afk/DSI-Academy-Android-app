/**
 * Dernière progression locale (site continueStore).
 * Vide par défaut, purgé à la déconnexion. AsyncStorage.
 */

import {storageGet, storageSet, storageRemove} from '@core/storage';
import {sessionStore} from '@core/session';

const KEY = 'dsi_continue';

export type ContinueEntry = {
  id: string;
  house: string;
  title: string;
  path: string;
  icon?: string | null;
  progress?: number | null;
  updatedAt: number;
};

function sanitize(raw: unknown): ContinueEntry | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const e = raw as Partial<ContinueEntry>;
  if (typeof e.id !== 'string' || !e.id) {
    return null;
  }
  return {
    id: e.id,
    house: typeof e.house === 'string' ? e.house : 'library',
    title: typeof e.title === 'string' ? e.title : e.id,
    path: typeof e.path === 'string' ? e.path : '/',
    icon: typeof e.icon === 'string' ? e.icon : null,
    progress: typeof e.progress === 'number' ? e.progress : null,
    updatedAt: typeof e.updatedAt === 'number' ? e.updatedAt : Date.now(),
  };
}

export const continueStore = {
  async get(): Promise<ContinueEntry | null> {
    const raw = await storageGet<unknown>(KEY, null);
    return sanitize(raw);
  },

  async set(
    entry: Omit<ContinueEntry, 'updatedAt'> & {updatedAt?: number},
  ): Promise<ContinueEntry | null> {
    if (!entry?.id) {
      return null;
    }
    const payload: ContinueEntry = {
      id: entry.id,
      house: entry.house || 'library',
      title: entry.title || entry.id,
      path: entry.path || '/',
      icon: entry.icon ?? null,
      progress: typeof entry.progress === 'number' ? entry.progress : null,
      updatedAt: entry.updatedAt ?? Date.now(),
    };
    await storageSet(KEY, payload);
    return payload;
  },

  async clear(): Promise<void> {
    await storageRemove(KEY);
  },
};

sessionStore.onSessionCleared(() => {
  void continueStore.clear();
});
