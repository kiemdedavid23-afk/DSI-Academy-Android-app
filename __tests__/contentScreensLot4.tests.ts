import type {CategoryNode} from '@core/utils/contentDisplay';
import {
  categoryChips,
  flattenNodes,
} from '../src/features/content/logic/categoryTree';

const n = (id: number, name: string, total: number, children: CategoryNode[] = [], parentId: number | null = null): CategoryNode => ({
  id, name, slug: name.toLowerCase(), parentId, depth: 1,
  contentCount: 0, totalCount: total, children,
});

const tree = [
  n(2, 'Zèbre', 1),
  n(1, 'Éducation', 11, [n(5, 'Python', 7, [n(9, 'Pandas', 2, [], 5)], 1), n(4, 'Écriture', 4, [], 1)]),
];

describe('categoryChips', () => {
  it('sans choix : catégories principales triées, avec total_count', () => {
    expect(categoryChips(tree, null).map(c => [c.id, c.count])).toEqual([[1, 11], [2, 1]]);
  });
  it('catégorie choisie : chemin puis sous-catégories', () => {
    expect(categoryChips(tree, 1).map(c => c.id)).toEqual([1, 4, 5]);
    expect(categoryChips(tree, 5).map(c => c.id)).toEqual([1, 5, 9]);
  });
  it('feuille choisie : chemin seul ; inconnue : niveau principal', () => {
    expect(categoryChips(tree, 9).map(c => c.id)).toEqual([1, 5, 9]);
    expect(categoryChips(tree, 99).map(c => c.id)).toEqual([1, 2]);
  });
  it('flattenNodes : tous les nœuds', () => {
    expect(flattenNodes(tree).map(x => x.id).sort()).toEqual([1, 2, 4, 5, 9]);
  });
});
