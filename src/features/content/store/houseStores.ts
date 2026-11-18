/** Stores de découverte par maison : Bibliothèque (livres), Audio, Vidéos. */

import {createCatalogueStore, libraryCatalogueStore} from './catalogueStore';
import {createCategoriesStore, libraryCategoriesStore} from './categoriesStore';
import {createCategoryTreeStore, libraryCategoryTreeStore} from './categoryTreeStore';
import {createSearchStore, librarySearchStore} from './searchStore';

export type DiscoverHouse = 'library' | 'audio' | 'videos' | 'formations';

export const HOUSE_STORES = {
  library: {
    catalogue: libraryCatalogueStore,
    categories: libraryCategoriesStore,
    tree: libraryCategoryTreeStore,
    search: librarySearchStore,
  },
  audio: {
    catalogue: createCatalogueStore('audio'),
    categories: createCategoriesStore('audio'),
    tree: createCategoryTreeStore('audio'),
    search: createSearchStore('audio'),
  },
  videos: {
    catalogue: createCatalogueStore('video'),
    categories: createCategoriesStore('video'),
    tree: createCategoryTreeStore('video'),
    search: createSearchStore('video'),
  },
  formations: {
    catalogue: createCatalogueStore('training'),
    categories: createCategoriesStore('training'),
    tree: createCategoryTreeStore('training'),
    search: createSearchStore('training'),
  },
} as const;
