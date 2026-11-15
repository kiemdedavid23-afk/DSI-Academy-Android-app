/** Stores de découverte par maison : Bibliothèque (livres), Audio, Vidéos. */

import {createCatalogueStore, libraryCatalogueStore} from './catalogueStore';
import {createCategoriesStore, libraryCategoriesStore} from './categoriesStore';
import {createSearchStore, librarySearchStore} from './searchStore';

export type DiscoverHouse = 'library' | 'audio' | 'videos';

export const HOUSE_STORES = {
  library: {
    catalogue: libraryCatalogueStore,
    categories: libraryCategoriesStore,
    search: librarySearchStore,
  },
  audio: {
    catalogue: createCatalogueStore('audio'),
    categories: createCategoriesStore('audio'),
    search: createSearchStore('audio'),
  },
  videos: {
    catalogue: createCatalogueStore('video'),
    categories: createCategoriesStore('video'),
    search: createSearchStore('video'),
  },
} as const;
