/**
 * Arbre des catégories d'un type (GET /content/categories/tree), cache 5 min.
 * Worker v1 (route absente : 404 NOT_FOUND) : repli sur la liste à plat.
 */

import {
  fetchCategories,
  fetchCategoryTree,
} from '@core/api/endpoints/content/catalogue.api';
import type {CategoryNode, ContentType} from '@core/utils/contentDisplay';
import {createResourceStore} from '@shared/store';
import {fromFlat} from '../logic/categoryTree';

const TTL_MS = 5 * 60_000;

export function createCategoryTreeStore(type: ContentType) {
  return createResourceStore<CategoryNode[]>({
    ttlMs: TTL_MS,
    fetcher: async () => {
      const tree = await fetchCategoryTree(type);
      if (tree.kind === 'success') {
        return tree.items;
      }
      if (tree.errorKind === 'notFound' && tree.code === 'NOT_FOUND') {
        const flat = await fetchCategories(type);
        if (flat.kind === 'failure') {
          throw new Error(flat.errorKind);
        }
        return fromFlat(flat.items);
      }
      throw new Error(tree.errorKind);
    },
  });
}

export const libraryCategoryTreeStore = createCategoryTreeStore('book');
