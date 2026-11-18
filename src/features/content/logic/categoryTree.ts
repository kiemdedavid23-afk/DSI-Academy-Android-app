/**
 * Arbre des catégories (GET /content/categories/tree) : navigation locale, un
 * niveau à la fois. Aucun appel réseau ici : tout se calcule sur l'arbre reçu.
 */

import type {Category, CategoryNode} from '@core/utils/contentDisplay';

/** Tri alphabétique français (le Worker trie en chaîne brute : é après z). */
export function sortByName(nodes: CategoryNode[]): CategoryNode[] {
  return [...nodes].sort(
    (a, b) =>
      a.name.localeCompare(b.name, 'fr', {sensitivity: 'base'}) || a.id - b.id,
  );
}

/** Enfants d'un nœud (null : catégories principales), triés. */
export function childrenOf(tree: CategoryNode[], parentId: number | null): CategoryNode[] {
  if (parentId === null) {
    return sortByName(tree);
  }
  const node = findNode(tree, parentId);
  return node ? sortByName(node.children) : [];
}

export function findNode(tree: CategoryNode[], id: number): CategoryNode | null {
  for (const node of tree) {
    if (node.id === id) {
      return node;
    }
    const inChild = findNode(node.children, id);
    if (inChild) {
      return inChild;
    }
  }
  return null;
}

/** Chemin de la catégorie principale jusqu'au nœud (fil d'Ariane), [] si inconnu. */
export function pathTo(tree: CategoryNode[], id: number): CategoryNode[] {
  for (const node of tree) {
    if (node.id === id) {
      return [node];
    }
    const sub = pathTo(node.children, id);
    if (sub.length > 0) {
      return [node, ...sub];
    }
  }
  return [];
}

/** Repli (Worker v1, route absente) : liste à plat vue comme un arbre sans enfants. */
export function fromFlat(categories: Category[]): CategoryNode[] {
  return categories.map(c => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    parentId: null,
    depth: 1,
    contentCount: c.count,
    totalCount: c.count,
    children: [],
  }));
}
