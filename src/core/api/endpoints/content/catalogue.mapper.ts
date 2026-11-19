import {
  asInt,
  asRecord,
  asString,
  asNumber,
  checkResponse,
  failure,
  isPubliclyVisible,
  mapContent,
  mapThumbnail,
} from './common.mapper';
import type {Content} from './common.types';
import type {
  CatalogueCursor,
  CatalogueResult,
  CategoriesResult,
  Category,
  CategoryNode,
  CategoryTreeResult,
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
  const createdAt = asInt(r.cursor_created_at);
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
      items.push({
        id,
        name,
        slug,
        count: asNumber(c.count) ?? 0,
        thumbnailUrl: mapThumbnail(c.thumbnail_url),
      });
    }
  });
  return {kind: 'success', items};
}

const TREE_MAX_NODES = 5000;

function mapCategoryNode(raw: unknown, budget: {left: number}): CategoryNode | null {
  const c = asRecord(raw);
  const id = asInt(c?.id);
  const name = asString(c?.name);
  const slug = asString(c?.slug);
  if (!c || id === null || name === null || slug === null || budget.left <= 0) {
    return null;
  }
  budget.left -= 1;
  const children: CategoryNode[] = [];
  if (Array.isArray(c.children)) {
    c.children.forEach(child => {
      const node = mapCategoryNode(child, budget);
      if (node) {
        children.push(node);
      }
    });
  }
  return {
    id,
    name,
    slug,
    parentId: asInt(c.parent_id),
    thumbnailUrl: mapThumbnail(c.thumbnail_url),
    depth: asInt(c.depth) ?? 1,
    contentCount: asNumber(c.content_count) ?? 0,
    totalCount: asNumber(c.total_count) ?? 0,
    children,
  };
}

/**
 * GET /content/categories/tree → { items: [nœud], max_depth }. Arbre vide :
 * succès. Worker v1 : 404 NOT_FOUND (route inconnue), à traiter par l'appelant
 * comme « arbre indisponible » (repli sur la liste à plat).
 */
export function mapCategoryTree(
  status: number,
  body: unknown,
  bodyKind?: string,
): CategoryTreeResult {
  const bad = checkResponse(status, body, bodyKind);
  if (bad) {
    return bad;
  }
  const r = asRecord(body);
  if (!r || !Array.isArray(r.items)) {
    return failure('invalidResponse', status, 'MISSING_ITEMS');
  }
  const budget = {left: TREE_MAX_NODES};
  const items: CategoryNode[] = [];
  r.items.forEach(entry => {
    const node = mapCategoryNode(entry, budget);
    if (node) {
      items.push(node);
    }
  });
  return {kind: 'success', items, maxDepth: asInt(r.max_depth) ?? 8};
}
