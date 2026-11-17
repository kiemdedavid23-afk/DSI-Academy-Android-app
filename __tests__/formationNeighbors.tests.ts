import {neighbors, type ProgramItem} from '@features/content/logic/formationTree';

const mod = (id: number): ProgramItem => ({
  kind: 'module', key: `m${id}`, contentId: id, title: `M${id}`, type: 'book', depth: 0, durationSeconds: null,
});
const sec: ProgramItem = {kind: 'section', key: 's1', title: 'S', depth: 0};

describe('neighbors', () => {
  const items = [mod(1), sec, mod(2), mod(3)];
  it('renvoie précédent et suivant en ignorant les sections', () => {
    expect(neighbors(items, 2)).toEqual({prev: items[0], next: items[3]});
  });
  it('aucun précédent au premier, aucun suivant au dernier', () => {
    expect(neighbors(items, 1).prev).toBeNull();
    expect(neighbors(items, 3).next).toBeNull();
  });
  it("rien si le module n'est pas dans la formation", () => {
    expect(neighbors(items, 99)).toEqual({prev: null, next: null});
  });
});
