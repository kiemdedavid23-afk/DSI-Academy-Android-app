import {
  fetchCategories,
  fetchCategoryTree,
} from '@core/api/endpoints/content/catalogue.api';
import {fetchPartsTree} from '@core/api/endpoints/content/parts.api';
import {fetchComponentTree} from '@core/api/endpoints/content/composition.api';
import type {CategoryNode, PartItem} from '@core/utils/contentDisplay';
import {createCategoryTreeStore} from '../src/features/content/store/categoryTreeStore';
import {createFormationStore} from '../src/features/content/store/formationStore';
import {
  childrenOf,
  findNode,
  fromFlat,
  pathTo,
} from '../src/features/content/logic/categoryTree';
import {flattenParts} from '../src/features/content/logic/formationTree';

jest.mock('@core/api/endpoints/content/catalogue.api');
jest.mock('@core/api/endpoints/content/parts.api');
jest.mock('@core/api/endpoints/content/composition.api');

const mTree = fetchCategoryTree as jest.Mock;
const mFlat = fetchCategories as jest.Mock;
const mParts = fetchPartsTree as jest.Mock;
const mComp = fetchComponentTree as jest.Mock;

const node = (id: number, name: string, children: CategoryNode[] = [], parentId: number | null = null): CategoryNode => ({
  id, name, slug: name.toLowerCase(), parentId, thumbnailUrl: null, depth: 1,
  contentCount: 1, totalCount: 1, children,
});

const summary = (id: number, type: 'training' | 'video' | 'book' | 'audio', title = `T${id}`) => ({
  id, uid: null, type, slug: `s${id}`, title, description: null, language: 'fr',
  level: null, thumbnailUrl: null, durationSeconds: 60,
});
const part = (linkId: number, type: 'training' | 'video' | 'book' | 'audio', position: number, children: PartItem[] = []): PartItem => ({
  index: position + 1, linkId, kind: type === 'training' ? 'module' : 'lesson', position, depth: 1,
  content: summary(linkId + 100, type), partsCount: children.length, durationSeconds: 60,
  durationComplete: true, children,
});

beforeEach(() => jest.resetAllMocks());

describe('logique de l\'arbre des catégories', () => {
  const tree = [node(2, 'Zèbre'), node(1, 'Éducation', [node(5, 'Python', [], 1), node(4, 'Écriture', [], 1)])];
  it('trie en français : É avant Z, é traité comme e', () => {
    expect(childrenOf(tree, null).map(n => n.name)).toEqual(['Éducation', 'Zèbre']);
    expect(childrenOf(tree, 1).map(n => n.name)).toEqual(['Écriture', 'Python']);
  });
  it('trouve un nœud et son chemin', () => {
    expect(findNode(tree, 5)?.name).toBe('Python');
    expect(pathTo(tree, 5).map(n => n.id)).toEqual([1, 5]);
    expect(pathTo(tree, 99)).toEqual([]);
    expect(childrenOf(tree, 99)).toEqual([]);
  });
  it('repli : liste à plat vue comme un arbre sans enfants', () => {
    expect(fromFlat([{id: 3, name: 'Dev', slug: 'dev', count: 4, thumbnailUrl: null}])[0]).toMatchObject({
      id: 3, parentId: null, contentCount: 4, totalCount: 4, children: [],
    });
  });
});

describe('categoryTreeStore', () => {
  it('arbre reçu', async () => {
    mTree.mockResolvedValue({kind: 'success', items: [node(1, 'A')], maxDepth: 8});
    const s = createCategoryTreeStore('book');
    await s.load();
    expect(s.getState().data).toHaveLength(1);
    expect(mFlat).not.toHaveBeenCalled();
  });
  it('route absente (NOT_FOUND) : repli sur la liste à plat', async () => {
    mTree.mockResolvedValue({kind: 'failure', errorKind: 'notFound', status: 404, code: 'NOT_FOUND'});
    mFlat.mockResolvedValue({kind: 'success', items: [{id: 3, name: 'Dev', slug: 'dev', count: 4, thumbnailUrl: null}]});
    const s = createCategoryTreeStore('book');
    await s.load();
    expect(s.getState().data?.[0]).toMatchObject({id: 3, totalCount: 4});
  });
  it('catégorie introuvable (CATEGORY_NOT_FOUND) ou réseau : erreur, pas de repli', async () => {
    mTree.mockResolvedValue({kind: 'failure', errorKind: 'network', status: null, code: null});
    const s = createCategoryTreeStore('book');
    await s.load();
    expect(s.getState().status).toBe('error');
    expect(mFlat).not.toHaveBeenCalled();
  });
});

describe('programme depuis les parties', () => {
  it('section (training) + modules, ordre des positions, sans doublon', () => {
    const items = flattenParts([
      part(2, 'video', 1),
      part(1, 'training', 0, [part(3, 'book', 0), part(3, 'book', 1)]),
    ]);
    expect(items.map(i => i.kind + ':' + i.key)).toEqual(['section:s1', 'module:m3', 'module:m2']);
    expect(items[1]).toMatchObject({kind: 'module', depth: 1, type: 'book'});
  });
});

describe('formationStore', () => {
  it('utilise les parties quand l\'œuvre en a', async () => {
    mParts.mockResolvedValue({kind: 'success', overview: {
      work: summary(1, 'training'), isWork: true, totalParts: 1, totalDurationSeconds: 60,
      durationComplete: true, unknownDurationParts: 0, items: [part(7, 'video', 0)],
    }});
    const s = createFormationStore();
    await s.load(1, 'F');
    expect(s.getState().status).toBe('success');
    expect(s.getState().items).toHaveLength(1);
    expect(mComp).not.toHaveBeenCalled();
  });
  it('sinon repli sur les composants', async () => {
    mParts.mockResolvedValue({kind: 'success', overview: {
      work: summary(1, 'training'), isWork: false, totalParts: 0, totalDurationSeconds: null,
      durationComplete: true, unknownDurationParts: 0, items: [],
    }});
    mComp.mockResolvedValue({kind: 'success', tree: {content: {id: 1, type: 'training'}, children: []}});
    const s = createFormationStore();
    await s.load(1, 'F');
    expect(mComp).toHaveBeenCalledWith(1);
    expect(s.getState().status).toBe('success');
  });
  it('Worker v1 (parties absentes) : repli, puis erreur si les composants échouent', async () => {
    mParts.mockResolvedValue({kind: 'failure', errorKind: 'notFound', status: 404, code: 'NOT_FOUND'});
    mComp.mockResolvedValue({kind: 'failure', errorKind: 'network', status: null, code: null});
    const s = createFormationStore();
    await s.load(1, 'F');
    expect(s.getState()).toMatchObject({status: 'error', errorKind: 'network'});
  });
});
