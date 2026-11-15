/* eslint-disable prettier/prettier */
import {http} from '@core/network';
import {
  fetchAsset,
  fetchAssets,
  fetchBestAsset,
} from '@core/api/endpoints/content/assets.api';
import {
  mapAssets,
  mapSingleAsset,
} from '@core/api/endpoints/content/assets.mapper';
import {
  fetchComponents,
  fetchComponentTree,
} from '@core/api/endpoints/content/composition.api';
import {
  mapComponents,
  mapTree,
  MAX_TREE_DEPTH,
} from '@core/api/endpoints/content/composition.mapper';
import assetsList from '../contracts/content/assets.list.json';
import assetsBest from '../contracts/content/assets.best.json';
import components from '../contracts/content/composition.components.json';
import tree from '../contracts/content/composition.tree.json';
import draft from '../contracts/content/content.draft.json';

jest.mock('@core/network', () => ({http: {service: jest.fn()}}));
const mockGet = jest.fn();
beforeEach(() => {
  mockGet.mockReset();
  (http.service as jest.Mock).mockReturnValue({get: mockGet});
});
const ok = (body: unknown) => ({status: 200, ok: true, body, bodyKind: 'json'});

describe('assets', () => {
  it('liste publique : pas de reference ; downloadable booléen', () => {
    const r = mapAssets(200, assetsList);
    expect(r.kind).toBe('success');
    if (r.kind === 'success') {
      expect(r.items).toHaveLength(2);
      expect(r.items[0]).toMatchObject({id: 34, format: 'pdf', sizeBytes: 2048000, downloadable: false});
      expect(Object.keys(r.items[0])).not.toContain('reference');
    }
  });
  it('liste vide = succès ; asset sans format ignoré', () => {
    expect(mapAssets(200, {items: []})).toMatchObject({kind: 'success', items: []});
    const r = mapAssets(200, {items: [{id: 1, content_id: 2}]});
    expect(r).toMatchObject({kind: 'success', items: []});
  });
  it('best : succès, 404 NO_AVAILABLE_ASSET', () => {
    expect(mapSingleAsset(200, assetsBest).kind).toBe('success');
    expect(mapSingleAsset(404, {error: 'NO_AVAILABLE_ASSET — x'})).toMatchObject({
      errorKind: 'notFound',
      code: 'NO_AVAILABLE_ASSET',
    });
  });
  it('api : chemins, filtres et id invalide', async () => {
    mockGet.mockResolvedValue(ok(assetsList));
    await fetchAssets(12, {format: 'pdf'});
    expect(mockGet).toHaveBeenLastCalledWith('/content/12/assets', {
      auth: 'none',
      query: {format: 'pdf', status: undefined},
    });
    mockGet.mockResolvedValue(ok(assetsBest));
    await fetchBestAsset(12);
    expect(mockGet).toHaveBeenLastCalledWith('/content/12/assets/best', {auth: 'none', query: {format: undefined}});
    await fetchAsset(34);
    expect(mockGet).toHaveBeenLastCalledWith('/assets/34', {auth: 'none'});
    mockGet.mockClear();
    expect(await fetchAssets(-1)).toMatchObject({errorKind: 'validation'});
    expect(await fetchAsset(1.5)).toMatchObject({errorKind: 'validation'});
    expect(mockGet).not.toHaveBeenCalled();
  });
});

describe('composition', () => {
  it('composants triés par position, enfant résumé', () => {
    const r = mapComponents(200, components);
    expect(r.kind === 'success' && r.items.map(i => i.childContentId)).toEqual([21, 22]);
    if (r.kind === 'success') {
      expect(r.items[0].child).toMatchObject({title: 'Module 1', type: 'video'});
    }
  });
  it('arbre : enfants triés, brouillon écarté', () => {
    const r = mapTree(200, tree);
    expect(r.kind).toBe('success');
    if (r.kind === 'success') {
      expect(r.tree.content.type).toBe('training');
      expect(r.tree.children.map(c => c.node.content.id)).toEqual([21, 22]);
    }
  });
  it('racine non publiée → notFound ; corps absent → invalidResponse', () => {
    expect(mapTree(200, {...draft, children: []})).toMatchObject({errorKind: 'notFound'});
    expect(mapTree(200, {})).toMatchObject({errorKind: 'invalidResponse'});
    expect(mapTree(404, {error: 'CONTENT_NOT_FOUND — x'})).toMatchObject({errorKind: 'notFound'});
  });
  it('profondeur au-delà de 10 : nœud refusé', () => {
    const leaf = (id: number): Record<string, unknown> => ({...(tree as Record<string, unknown>), id, children: []});
    let node = leaf(100);
    for (let i = 0; i < MAX_TREE_DEPTH + 1; i += 1) {
      node = {...leaf(200 + i), children: [{component: {id: i + 1, component_type: 'module', position: 1}, content: node}]};
    }
    const r = mapTree(200, node);
    expect(r.kind).toBe('success');
    if (r.kind === 'success') {
      let depth = 0;
      let cur = r.tree;
      while (cur.children.length > 0) {
        cur = cur.children[0].node;
        depth += 1;
      }
      expect(depth).toBeLessThan(MAX_TREE_DEPTH + 1);
    }
  });
  it('api : chemins et id invalide', async () => {
    mockGet.mockResolvedValue(ok(components));
    await fetchComponents(20);
    expect(mockGet).toHaveBeenLastCalledWith('/content/20/components', {auth: 'none'});
    mockGet.mockResolvedValue(ok(tree));
    await fetchComponentTree(20);
    expect(mockGet).toHaveBeenLastCalledWith('/content/20/components/tree', {auth: 'none'});
    expect(await fetchComponentTree(0)).toMatchObject({errorKind: 'validation'});
  });
});
