/**
 * Progression de lecture locale par contenu (site : progressStore).
 * Un pourcentage (0 à 100) par id. Purgé à la déconnexion. AsyncStorage.
 */

import {storageGet, storageSet} from '@core/storage';
import {sessionStore} from '@core/session';

const KEY = 'dsi_progress';

type ProgressMap = Record<string, {percent: number; updatedAt: number}>;

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n));
}

async function readAll(): Promise<ProgressMap> {
  const raw = await storageGet<unknown>(KEY, {});
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  const out: ProgressMap = {};
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    const e = v as {percent?: unknown; updatedAt?: unknown} | null;
    if (e && typeof e.percent === 'number' && Number.isFinite(e.percent)) {
      out[id] = {
        percent: clamp(e.percent),
        updatedAt: typeof e.updatedAt === 'number' ? e.updatedAt : 0,
      };
    }
  }
  return out;
}

export const progressStore = {
  async get(id: number | string): Promise<number | null> {
    const all = await readAll();
    return all[String(id)]?.percent ?? null;
  },

  async save(id: number | string, percent: number): Promise<void> {
    if (!Number.isFinite(percent)) {
      return;
    }
    const all = await readAll();
    all[String(id)] = {percent: clamp(percent), updatedAt: Date.now()};
    await storageSet(KEY, all);
  },

  async clear(): Promise<void> {
    await storageSet(KEY, {});
  },
};

sessionStore.onSessionCleared(() => {
  void progressStore.clear();
});
