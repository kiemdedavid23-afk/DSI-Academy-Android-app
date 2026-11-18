import {fetchPartsTree} from '@core/api/endpoints/content/parts.api';
import type {PartItem} from '@core/utils/contentDisplay';
import {createFormationStore} from '../src/features/content/store/formationStore';
import {flattenParts} from '../src/features/content/logic/formationTree';

jest.mock('@core/api/endpoints/content/parts.api');
jest.mock('@core/api/endpoints/content/composition.api');

const sum = (id: number, type: 'book' | 'audio') => ({
  id, uid: null, type, slug: `s${id}`, title: `T${id}`, description: null,
  language: 'fr', level: null, thumbnailUrl: null, durationSeconds: null,
});
const part = (linkId: number, type: 'book' | 'audio', position: number, children: PartItem[] = []): PartItem => ({
  index: position + 1, linkId, kind: 'chapter', position, depth: 1,
  content: sum(linkId + 100, type), partsCount: children.length, durationSeconds: null,
  durationComplete: true, children,
});

beforeEach(() => jest.resetAllMocks());

describe('œuvre composée (livre en chapitres)', () => {
  it('chapitres = modules ; un tome avec chapitres = section', () => {
    const items = flattenParts([
      part(1, 'book', 0),
      part(2, 'book', 1, [part(3, 'book', 0), part(4, 'book', 1)]),
    ]);
    expect(items.map(i => `${i.kind}:${i.key}:${i.depth}`)).toEqual([
      'module:m1:0', 'section:s2:0', 'module:m3:1', 'module:m4:1',
    ]);
  });
  it('le store garde la maison choisie pour « Reprendre »', async () => {
    mockParts();
    const s = createFormationStore();
    await s.load(1, 'Livre', 'library');
    expect(s.getState()).toMatchObject({status: 'success', house: 'library'});
    expect(s.getState().items).toHaveLength(2);
  });
  it('maison par défaut : formations', async () => {
    mockParts();
    const s = createFormationStore();
    await s.load(1, 'Formation');
    expect(s.getState().house).toBe('formations');
  });
});

function mockParts() {
  (fetchPartsTree as jest.Mock).mockResolvedValue({
    kind: 'success',
    overview: {
      work: sum(1, 'book'), isWork: true, totalParts: 2, totalDurationSeconds: null,
      durationComplete: true, unknownDurationParts: 0,
      items: [part(1, 'book', 0), part(2, 'book', 1)],
    },
  });
}
