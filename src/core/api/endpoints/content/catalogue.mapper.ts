import {
  asInt,
  asRecord,
  asString,
  asNumber,
  checkResponse,
  failure,
  isPubliclyVisible,
  mapContent,
} from './common.mapper';
import type {Content} from './common.types';
import type {
  CatalogueCursor,
  CatalogueResult,
  CategoriesResult,
  Category,
  ContentDetailResult,
  SearchResult,
} from './catalogue.types';

function mapContentList(raw: unknown): {items: Content[]; hidden: number} {
  const list = Array.isArray(raw) ? raw : [];
  const items: Content[] = [];
  let hidden = 0;
  list.forEach(entry => {
    const content = mapContent(entry);
    if (content === null) {
      return;
    }
    if (isPubliclyVisible(content)) {
      items.push(content);
    } else {
      hidden += 1;
    }
  });
  return {items, hidden};
}

function mapCursor(raw: unknown): CatalogueCursor | null {
  const r = asRecord(raw);
  if (!r) {
    return null;
  }
  const createdAt = asString(r.cursor_created_at);
  const id = asInt(r.cursor_id);
  return createdAt !== null && id !== null ? {createdAt, id} : null;
}

/** GET /content → { items, next_cursor }. Catalogue vide : jamais une erreur. */
export function mapCatalogue(
  status: number,
  body: unknown,
  bodyKind?: string,
): CatalogueResult {
  const bad = checkResponse(status, body, bodyKind);
  if (bad) {
    return bad;
  }
  const r = asRecord(body);
  if (!r || !Array.isArray(r.items)) {
    return failure('invalidResponse', status, 'MISSING_ITEMS');
  }
  const {items, hidden} = mapContentList(r.items);
  return {
    kind: 'success',
    items,
    nextCursor: mapCursor(r.next_cursor),
    hiddenCount: hidden,
  };
}

/** GET /content/:id et /content/by-slug/:type/:slug → un contenu visible. */
export function mapContentDetail(
  status: number,
  body: unknown,
  bodyKind?: string,
): ContentDetailResult {
  const bad = checkResponse(status, body, bodyKind);
  if (bad) {
    return bad;
  }
  const content = mapContent(body);
  if (content === null) {
    return failure('invalidResponse', status, 'INVALID_CONTENT');
  }
  if (!isPubliclyVisible(content)) {
    return failure('notFound', status, 'CONTENT_NOT_VISIBLE');
  }
  return {kind: 'success', item: content};
}

/** GET /search → { query, items, limit, offset }. Aucun résultat : items []. */
export function mapSearch(
  status: number,
  body: unknown,
  bodyKind?: string,
): SearchResult {
  const bad = checkResponse(status, body, bodyKind);
  if (bad) {
    return bad;
  }
  const r = asRecord(body);
  if (!r || !Array.isArray(r.items)) {
    return failure('invalidResponse', status, 'MISSING_ITEMS');
  }
  return {
    kind: 'success',
    query: asString(r.query) ?? '',
    items: mapContentList(r.items).items,
    limit: asNumber(r.limit) ?? 0,
    offset: asNumber(r.offset) ?? 0,
  };
}

/** GET /content/categories → { items: [{ id, name, slug, count }] }. */
export function mapCategories(
  status: number,
  body: unknown,
  bodyKind?: string,
): CategoriesResult {
  const bad = checkResponse(status, body, bodyKind);
  if (bad) {
    return bad;
  }
  const r = asRecord(body);
  if (!r || !Array.isArray(r.items)) {
    return failure('invalidResponse', status, 'MISSING_ITEMS');
  }
  const items: Category[] = [];
  r.items.forEach(entry => {
    const c = asRecord(entry);
    const id = asInt(c?.id);
    const name = asString(c?.name);
    const slug = asString(c?.slug);
    if (c && id !== null && name !== null && slug !== null) {
      items.push({id, name, slug, count: asNumber(c.count) ?? 0});
    }
  });
  return {kind: 'success', items};
}
