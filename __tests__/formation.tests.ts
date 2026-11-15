import {DONE_PERCENT, flattenProgram, modulesOf, summarize} from '../src/features/content/logic/formationTree';

type Node = Parameters<typeof flattenProgram>[0];

function content(id: number, type: string, title = `c${id}`) {
  return {id, type, title, durationSeconds: null} as unknown as Node['content'];
}
function link(id: number, position: number) {
  return {id, componentType: 'module', position};
}
function node(id: number, type: string, children: Node['children'] = []): Node {
  return {content: content(id, type), children};
}

const tree: Node = node(1, 'training', [
  {component: link(12, 2), node: node(3, 'video')},
  {component: link(11, 1), node: node(2, 'training', [
    {component: link(21, 2), node: node(5, 'book')},
    {component: link(20, 1), node: node(4, 'audio')},
  ])},
  {component: link(13, 3), node: node(1, 'video')}, // cycle : ignoré
]);

describe('programme de formation', () => {
  it('ordonne par position, section avant ses modules', () => {
    const items = flattenProgram(tree);
    expect(items.map(i => (i.kind === 'section' ? `S${i.title}` : i.contentId))).toEqual(['Sc2', 4, 5, 3]);
    expect(items[1]).toMatchObject({kind: 'module', depth: 1, type: 'audio'});
    expect(items[3]).toMatchObject({kind: 'module', depth: 0, type: 'video'});
  });
  it('ignore un composant qui reboucle sur la formation', () => {
    expect(modulesOf(flattenProgram(tree)).map(m => m.contentId)).not.toContain(1);
  });
});

describe('progression de formation', () => {
  const items = flattenProgram(tree);
  it('compte les modules terminés et propose le suivant', () => {
    const s = summarize(items, {4: 100, 5: 40});
    expect(s).toMatchObject({total: 3, done: 1, percent: 33, nextModuleId: 5, started: true});
  });
  it('formation neuve, puis terminée', () => {
    expect(summarize(items, {})).toMatchObject({done: 0, nextModuleId: 4, started: false});
    const all = {4: DONE_PERCENT, 5: 100, 3: 99};
    expect(summarize(items, all)).toMatchObject({done: 3, percent: 100, nextModuleId: null});
  });
  it('formation vide', () => {
    expect(summarize([], {})).toMatchObject({total: 0, percent: 0, nextModuleId: null});
  });
});
