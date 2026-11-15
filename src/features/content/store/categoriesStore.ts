/**
 * Catégories utilisables par le public pour un type (GET /content/categories).
 * Cache 5 min via l'outil commun (R-DATA-3/4).
 */

import {fetchCategories} from '@core/api/endpoints/content/catalogue.api';
import type {Category} from '@core/utils/contentDisplay';
import type {ContentType} from '@core/utils/contentDisplay';
import {createResourceStore} from '@shared/store';

const TTL_MS = 5 * 60_000;

export function createCategoriesStore(type: ContentType) {
  return createResourceStore<Category[]>({
    ttlMs: TTL_MS,
    fetcher: async () => {
      const res = await fetchCategories(type);
      if (res.kind === 'failure') {
        throw new Error(res.errorKind);
      }
      return res.items;
    },
  });
}

export const libraryCategoriesStore = createCategoriesStore('book');
