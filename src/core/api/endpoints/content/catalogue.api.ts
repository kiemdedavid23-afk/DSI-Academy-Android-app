import {http} from '@core/network';
import {cached} from '../../../cache/diskCache';
import {catchNet} from './common.api';
import {failure} from './common.mapper';
import type {ContentType} from './common.types';
import {
  mapCatalogue,
  mapCategories,
  mapContentDetail,
  mapSearch,
} from './catalogue.mapper';
import type {
  CatalogueParams,
  CatalogueResult,
  CategoriesResult,
  ContentDetailResult,
  SearchParams,
  SearchResult,
} from './catalogue.types';

/**
 * GET /content?type=&category_id=&language=&limit=&cursor_created_at=&cursor_id=
 * Routes publiques (aucune preuve d'accès). On demande editorial_status=published ;
 * le contrôle moderation_status se fait au mapper (NOTES-ET-ECARTS n°2).
 */
async function fetchCatalogueRemote(
  params: CatalogueParams,
): Promise<CatalogueResult> {
  try {
    const cursor = params.cursor ?? null;
    const response = await http.service('content').get('/content', {
      auth: 'none',
      query: {
        type: params.type,
        editorial_status: 'published',
        category_id: params.categoryId,
        language: params.language,
        limit: params.limit,
        cursor_created_at: cursor ? cursor.createdAt : undefined,
        cursor_id: cursor ? cursor.id : undefined,
      },
    });
    return mapCatalogue(response.status, response.body, response.bodyKind);
  } catch (err) {
    return catchNet(err);
  }
}

/** GET /content/:id */
async function fetchContentByIdRemote(
  id: number,
): Promise<ContentDetailResult> {
  if (!Number.isInteger(id) || id <= 0) {
    return failure('validation', null, 'INVALID_ID');
  }
  try {
    const response = await http
      .service('content')
      .get(`/content/${id}`, {auth: 'none'});
    return mapContentDetail(response.status, response.body, response.bodyKind);
  } catch (err) {
    return catchNet(err);
  }
}

/** GET /content/by-slug/:type/:slug */
async function fetchContentBySlugRemote(
  type: ContentType,
  slug: string,
): Promise<ContentDetailResult> {
  if (!slug) {
    return failure('validation', null, 'MISSING_SLUG');
  }
  try {
    const response = await http
      .service('content')
      .get(
        `/content/by-slug/${type}/${encodeURIComponent(slug)}`,
        {auth: 'none'},
      );
    return mapContentDetail(response.status, response.body, response.bodyKind);
  } catch (err) {
    return catchNet(err);
  }
}

/**
 * GET /search?q=&type=&language=&category_id=&limit=&offset=
 * q vide : MISSING_QUERY (422) du Worker, évité ici sans appel réseau.
 */
export async function searchContent(
  params: SearchParams,
): Promise<SearchResult> {
  const q = params.query.trim();
  if (q === '') {
    return failure('validation', null, 'MISSING_QUERY');
  }
  try {
    const response = await http.service('content').get('/search', {
      auth: 'none',
      query: {
        q,
        type: params.type,
        language: params.language,
        category_id: params.categoryId,
        limit: params.limit,
        offset: params.offset,
      },
    });
    return mapSearch(response.status, response.body, response.bodyKind);
  } catch (err) {
    return catchNet(err);
  }
}

/** GET /content/categories?type= (catégories actives ayant du contenu publié). */
async function fetchCategoriesRemote(
  type: ContentType,
): Promise<CategoriesResult> {
  try {
    const response = await http
      .service('content')
      .get('/content/categories', {auth: 'none', query: {type}});
    return mapCategories(response.status, response.body, response.bodyKind);
  } catch (err) {
    return catchNet(err);
  }
}

export function fetchCatalogue(params: CatalogueParams): Promise<CatalogueResult> {
  return cached(`catalogue:${JSON.stringify(params)}`, () => fetchCatalogueRemote(params));
}

export function fetchContentById(id: number): Promise<ContentDetailResult> {
  return cached(`content:${id}`, () => fetchContentByIdRemote(id));
}

export function fetchContentBySlug(type: ContentType, slug: string): Promise<ContentDetailResult> {
  return cached(`slug:${type}:${slug}`, () => fetchContentBySlugRemote(type, slug));
}

export function fetchCategories(type: ContentType): Promise<CategoriesResult> {
  return cached(`categories:${type}`, () => fetchCategoriesRemote(type));
}
