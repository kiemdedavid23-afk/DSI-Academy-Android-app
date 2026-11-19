import {
  mapCategories,
  mapCategoryTree,
} from '../src/core/api/endpoints/content/catalogue.mapper';
import {categoryChips, fromFlat} from '../src/features/content/logic/categoryTree';

const COVER = 'https://cdn.example.invalid/categories/developpement.jpg';

describe('image de couverture des catégories', () => {
  it('liste à plat : thumbnail_url https lu', () => {
    const r = mapCategories(200, {items: [{id: 3, name: 'Dev', slug: 'dev', count: 4, thumbnail_url: COVER}]});
    expect(r).toMatchObject({kind: 'success', items: [{id: 3, thumbnailUrl: COVER}]});
  });
  it('absente, nulle ou non https : null (carte avec illustration de la maison)', () => {
    const r = mapCategories(200, {items: [
      {id: 1, name: 'A', slug: 'a', count: 1},
      {id: 2, name: 'B', slug: 'b', count: 1, thumbnail_url: null},
      {id: 3, name: 'C', slug: 'c', count: 1, thumbnail_url: 'http://x.invalid/c.jpg'},
    ]});
    if (r.kind !== 'success') {
      throw new Error('attendu : succès');
    }
    expect(r.items.map(c => c.thumbnailUrl)).toEqual([null, null, null]);
  });
  it('arbre : image lue à chaque niveau', () => {
    const r = mapCategoryTree(200, {items: [{
      id: 3, name: 'Dev', slug: 'dev', parent_id: null, depth: 1, content_count: 1, total_count: 2,
      thumbnail_url: COVER,
      children: [{id: 8, name: 'Py', slug: 'py', parent_id: 3, depth: 2, content_count: 1, total_count: 1,
        thumbnail_url: COVER, children: []}],
    }], max_depth: 8});
    if (r.kind !== 'success') {
      throw new Error('attendu : succès');
    }
    expect(r.items[0].thumbnailUrl).toBe(COVER);
    expect(r.items[0].children[0].thumbnailUrl).toBe(COVER);
  });
  it('repli et chips conservent l\'image', () => {
    const nodes = fromFlat([{id: 3, name: 'Dev', slug: 'dev', count: 4, thumbnailUrl: COVER}]);
    expect(nodes[0].thumbnailUrl).toBe(COVER);
    expect(categoryChips(nodes, null)[0].thumbnailUrl).toBe(COVER);
  });
});
