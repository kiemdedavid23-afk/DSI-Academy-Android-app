import {
  asDateIso,
  asInt,
  asNumber,
  asRecord,
  asString,
  checkResponse,
  failure,
  isContentType,
  isPubliclyVisible,
  mapContent,
} from './common.mapper';
import type {
  ComponentChild,
  ComponentsResult,
  ContentComponent,
  ContentTreeNode,
  TreeResult,
} from './composition.types';

/** Profondeur maximale de l'arbre côté Worker (API.md : 10). */
export const MAX_TREE_DEPTH = 10;

function mapChild(raw: unknown): ComponentChild | null {
  const r = asRecord(raw);
  const title = asString(r?.title);
  const slug = asString(r?.slug);
  if (!r || title === null || slug === null || !isContentType(r.type)) {
    return null;
  }
  return {uid: asString(r.uid), title, type: r.type, slug};
}

export function mapComponent(raw: unknown): ContentComponent | null {
  const r = asRecord(raw);
  if (!r) {
    return null;
  }
  const id = asInt(r.id);
  const parentContentId = asInt(r.parent_content_id);
  const childContentId = asInt(r.child_content_id);
  if (id === null || parentContentId === null || childContentId === null) {
    return null;
  }
  return {
    id,
    parentContentId,
    childContentId,
    componentType: asString(r.component_type) ?? 'resource',
    position: asNumber(r.position) ?? 0,
    status: asString(r.status) ?? 'active',
    metadata: asRecord(r.metadata) ?? {},
    createdAt: asDateIso(r.created_at),
    child: mapChild(r.child),
  };
}

/** GET /content/:parent_id/components → { items } triés par position. */
export function mapComponents(
  status: number,
  body: unknown,
  bodyKind?: string,
): ComponentsResult {
  const bad = checkResponse(status, body, bodyKind);
  if (bad) {
    return bad;
  }
  const r = asRecord(body);
  if (!r || !Array.isArray(r.items)) {
    return failure('invalidResponse', status, 'MISSING_ITEMS');
  }
  const items: ContentComponent[] = [];
  r.items.forEach(entry => {
    const component = mapComponent(entry);
    if (component) {
      items.push(component);
    }
  });
  items.sort((a, b) => a.position - b.position);
  return {kind: 'success', items};
}

/**
 * Nœud d'arbre : le contenu est à plat avec `children` (API.md).
 * Les enfants non publiés ou modérés sont écartés (NOTES-ET-ECARTS n°2).
 */
function mapNode(raw: unknown, depth: number): ContentTreeNode | null {
  if (depth > MAX_TREE_DEPTH) {
    return null;
  }
  const content = mapContent(raw);
  const r = asRecord(raw);
  if (!content || !r) {
    return null;
  }
  const children: ContentTreeNode['children'] = [];
  if (Array.isArray(r.children)) {
    r.children.forEach(entry => {
      const link = asRecord(entry);
      const comp = asRecord(link?.component);
      const id = asInt(comp?.id);
      const node = mapNode(link?.content, depth + 1);
      if (comp && id !== null && node && isPubliclyVisible(node.content)) {
        children.push({
          component: {
            id,
            componentType: asString(comp.component_type) ?? 'resource',
            position: asNumber(comp.position) ?? 0,
          },
          node,
        });
      }
    });
    children.sort((a, b) => a.component.position - b.component.position);
  }
  return {content, children};
}

/** GET /content/:parent_id/components/tree */
export function mapTree(
  status: number,
  body: unknown,
  bodyKind?: string,
): TreeResult {
  const bad = checkResponse(status, body, bodyKind);
  if (bad) {
    return bad;
  }
  const tree = mapNode(body, 0);
  if (!tree) {
    return failure('invalidResponse', status, 'INVALID_TREE');
  }
  if (!isPubliclyVisible(tree.content)) {
    return failure('notFound', status, 'CONTENT_NOT_VISIBLE');
  }
  return {kind: 'success', tree};
}
