import {http} from '@core/network';
import {sessionStore} from '@core/session';
import {fetchMemberCard, searchMembers} from '@core/api/endpoints/community/directory.api';
import search from '../contracts/community/members.search.json';
import searchEmpty from '../contracts/community/members.search.empty.json';
import cardNone from '../contracts/community/member.card.none.json';
import cardBlocked from '../contracts/community/member.card.blocked.json';
import cardSelf from '../contracts/community/member.card.self.json';
import notFound from '../contracts/community/error.404.notFound.json';

jest.mock('@core/network', () => ({
  http: {service: jest.fn()},
  safeEnvelope: jest.requireActual('@core/network/envelope').safeEnvelope,
}));
jest.mock('@core/session', () => ({sessionStore: {getAccessProof: jest.fn()}}));

const mockGet = jest.fn();
const res = (status: number, body: unknown) =>
  Promise.resolve({status, ok: status < 300, body, bodyKind: 'json' as const});

beforeEach(() => {
  mockGet.mockReset();
  (http.service as jest.Mock).mockReturnValue({get: mockGet});
  (sessionStore.getAccessProof as jest.Mock).mockReturnValue('proof.sig');
});

describe('Communauté : recherche', () => {
  it('envoie q en paramètre, service community, preuve d’accès', async () => {
    mockGet.mockReturnValue(res(200, search));
    const r = await searchMembers('moussa');
    expect(mockGet).toHaveBeenCalledWith('/api/community/members/search', {
      auth: 'accessProof',
      query: {q: 'moussa'},
    });
    expect(r.kind === 'success' && r.items[0].publicPseudonym).toBe('@moussa');
  });
  it('aucun résultat : liste vide, pas une erreur', async () => {
    mockGet.mockReturnValue(res(200, searchEmpty));
    const r = await searchMembers('inconnu');
    expect(r.kind === 'success' && r.items).toEqual([]);
  });
  it('sans preuve : échec local', async () => {
    (sessionStore.getAccessProof as jest.Mock).mockReturnValue(null);
    const r = await searchMembers('x');
    expect(r.kind === 'failure' && r.errorKind).toBe('noProof');
    expect(mockGet).not.toHaveBeenCalled();
  });
});

describe('Communauté : fiche membre', () => {
  it('encode le @ du pseudonyme', async () => {
    mockGet.mockReturnValue(res(200, cardNone));
    await fetchMemberCard('@moussa');
    expect(mockGet.mock.calls[0][0]).toBe('/api/community/members/%40moussa');
  });
  it('état du contact repris ; byThem jamais exposé', async () => {
    mockGet.mockReturnValue(res(200, cardBlocked));
    const r = await fetchMemberCard('moussa');
    expect(r.kind).toBe('success');
    if (r.kind === 'success') {
      expect(r.card.contact).toEqual({status: 'PENDING_INCOMING', relationId: 'rel_9'});
      expect(r.card.blockedByMe).toBe(true);
      expect(JSON.stringify(r.card)).not.toContain('byThem');
    }
  });
  it('sa propre fiche : self, ni contact ni blocage', async () => {
    mockGet.mockReturnValue(res(200, cardSelf));
    const r = await fetchMemberCard('awa');
    expect(r.kind === 'success' && r.card.self).toBe(true);
    expect(r.kind === 'success' && r.card.contact).toBeNull();
    expect(r.kind === 'success' && r.card.blockedByMe).toBe(false);
  });
  it('introuvable : échec notFound', async () => {
    mockGet.mockReturnValue(res(404, notFound));
    const r = await fetchMemberCard('zzz');
    expect(r.kind === 'failure' && r.errorKind).toBe('notFound');
  });
});
