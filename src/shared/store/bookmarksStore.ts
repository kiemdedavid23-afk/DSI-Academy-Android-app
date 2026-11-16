/**
 * Signets du lecteur PDF (site : bookmarks de PdfViewer) : numéros de page
 * (à partir de 1) par contenu. Locaux, purgés à la déconnexion.
 */

import {storageGet, storageSet} from '@core/storage';
import {sessionStore} from '@core/session';

const KEY = 'dsi_pdf_bookmarks';

type BookmarkMap = Record<string, number[]>;

function sanitize(raw: unknown): BookmarkMap {
  const out: BookmarkMap = {};
  if (!raw || typeof raw !== 'object') {
    return out;
  }
  for (const [id, pages] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(pages)) {
      continue;
    }
    const clean = pages.filter(p => Number.isInteger(p) && (p as number) > 0) as number[];
    if (clean.length > 0) {
      out[id] = [...new Set(clean)].sort((a, b) => a - b);
    }
  }
  return out;
}

export const bookmarksStore = {
  async list(contentId: number): Promise<number[]> {
    const all = sanitize(await storageGet<unknown>(KEY, {}));
    return all[String(contentId)] ?? [];
  },

  /** Ajoute ou retire un signet. Renvoie la liste à jour. */
  async toggle(contentId: number, page: number): Promise<number[]> {
    const all = sanitize(await storageGet<unknown>(KEY, {}));
    const key = String(contentId);
    const current = all[key] ?? [];
    const next = current.includes(page)
      ? current.filter(p => p !== page)
      : [...current, page].sort((a, b) => a - b);
    if (next.length > 0) {
      all[key] = next;
    } else {
      delete all[key];
    }
    await storageSet(KEY, all);
    return next;
  },

  async clear(): Promise<void> {
    await storageSet(KEY, {});
  },
};

sessionStore.onSessionCleared(() => {
  void bookmarksStore.clear();
});
