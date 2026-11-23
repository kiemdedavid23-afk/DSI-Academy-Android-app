import * as api from '@core/api/endpoints/community/contacts.api';
import {
  acceptRequestAction,
  blockMemberAction,
  requestContactAction,
} from '../src/features/community/store/contactActions';
import {contactsStore} from '../src/features/community/store/contactsStore';
import {cleanQuery, memberDirectory} from '../src/features/community/store/memberDirectoryStore';
import * as dir from '@core/api/endpoints/community/directory.api';

jest.mock('@core/session', () => ({
  sessionStore: {
    getAccessProof: jest.fn(() => 'proof.sig'),
    getSession: jest.fn(() => ({subscriptionActive: true})),
    onSessionCleared: jest.fn(),
    expireSession: jest.fn(),
  },
}));
jest.mock('@core/api/endpoints/community/contacts.api', () => ({
  fetchContacts: jest.fn(),
  fetchContactRequests: jest.fn(),
  requestContact: jest.fn(),
  acceptContactRequest: jest.fn(),
  rejectContactRequest: jest.fn(),
  cancelContactRequest: jest.fn(),
  removeContact: jest.fn(),
  blockMember: jest.fn(),
  unblockMember: jest.fn(),
}));
jest.mock('@core/api/endpoints/community/directory.api', () => ({
  searchMembers: jest.fn(),
  fetchMemberCard: jest.fn(),
}));
jest.mock('@core/api/endpoints/community/me.api', () => ({fetchCommunityMe: jest.fn()}));

const contacts = api as jest.Mocked<typeof api>;
const directory = dir as jest.Mocked<typeof dir>;
const peer = {
  userId: 'DSI-0002', displayName: 'Moussa', pseudonym: 'moussa', publicPseudonym: '@moussa',
  avatarUrl: null, avatarThumbUrl: null, avatarUrlExpiresAt: null,
};
const fail = (code: string) => ({
  kind: 'failure' as const, errorKind: 'forbidden' as const, status: 403, code, field: null, retryAfterSeconds: null,
});

beforeEach(() => {
  jest.clearAllMocks();
  contacts.fetchContacts.mockResolvedValue({kind: 'success', items: []});
  contacts.fetchContactRequests.mockResolvedValue({
    kind: 'success',
    requests: {incoming: [], outgoing: []},
  });
  memberDirectory.reset();
});

describe('Actions contacts', () => {
  it('chaque issue de demande a son message', async () => {
    const cases: Array<[string, string]> = [
      ['created', 'communityApp.member.requestSent'],
      ['duplicate', 'communityApp.member.requestDuplicate'],
      ['cross', 'communityApp.member.requestCross'],
      ['alreadyContacts', 'communityApp.member.requestAlready'],
    ];
    for (const [outcome, key] of cases) {
      contacts.requestContact.mockResolvedValue({kind: 'success', outcome} as never);
      const r = await requestContactAction('DSI-0002');
      expect(r).toEqual({ok: true, infoKey: key});
    }
  });
  it('succès : la liste des contacts est relue', async () => {
    contacts.acceptContactRequest.mockResolvedValue({kind: 'success'});
    await acceptRequestAction('rel_2');
    expect(contacts.fetchContacts).toHaveBeenCalled();
  });
  it('blocage neutre : message d’indisponibilité, pas de relecture', async () => {
    contacts.blockMember.mockResolvedValue(fail('INTERACTION_UNAVAILABLE'));
    const r = await blockMemberAction('DSI-0002');
    expect(r).toEqual({ok: false, errorKey: 'communityApp.errors.interactionUnavailable'});
    expect(contacts.fetchContacts).not.toHaveBeenCalled();
  });
});

describe('Recherche et fiches', () => {
  it('saisie nettoyée : @ initiaux retirés, vide = aucun appel', async () => {
    expect(cleanQuery('  @@Awa ')).toBe('Awa');
    await memberDirectory.search('  @ ');
    expect(directory.searchMembers).not.toHaveBeenCalled();
  });
  it('une recherche plus ancienne ne remplace pas la plus récente', async () => {
    let resolveFirst: (v: unknown) => void = () => undefined;
    directory.searchMembers
      .mockReturnValueOnce(new Promise(r => (resolveFirst = r)) as never)
      .mockResolvedValueOnce({kind: 'success', items: [peer]});
    const first = memberDirectory.search('a1');
    await memberDirectory.search('moussa');
    resolveFirst({kind: 'success', items: []});
    await first;
    expect(memberDirectory.getState().search.items).toEqual([peer]);
  });
  it('fiche introuvable : état notFound, sans message d’erreur', async () => {
    directory.fetchMemberCard.mockResolvedValue({
      kind: 'failure', errorKind: 'notFound', status: 404, code: 'NOT_FOUND', field: null, retryAfterSeconds: null,
    });
    await memberDirectory.loadCard('zzz');
    expect(memberDirectory.getState().cards.zzz.status).toBe('notFound');
  });
  it('rechargement silencieux en échec : la fiche affichée reste', async () => {
    const card = {member: peer, self: false, contact: {status: 'NONE', relationId: null}, blockedByMe: false};
    directory.fetchMemberCard.mockResolvedValueOnce({kind: 'success', card} as never);
    await memberDirectory.loadCard('moussa');
    directory.fetchMemberCard.mockResolvedValueOnce(fail('NETWORK_ERROR') as never);
    await memberDirectory.loadCard('moussa', {silent: true});
    const entry = memberDirectory.getState().cards.moussa;
    expect(entry.status).toBe('ready');
    expect(entry.card).toEqual(card);
  });
});

describe('Store des contacts', () => {
  it('un échec des demandes n’empêche pas d’afficher les contacts', async () => {
    contacts.fetchContactRequests.mockResolvedValue(fail('NETWORK_ERROR') as never);
    await contactsStore.load({force: true});
    expect(contactsStore.getState().data).toEqual({contacts: [], incoming: [], outgoing: []});
  });
  it('un échec de la liste des contacts est une erreur', async () => {
    contacts.fetchContacts.mockResolvedValue(fail('SUBSCRIPTION_INACTIVE') as never);
    contactsStore.reset();
    await contactsStore.load({force: true});
    expect(contactsStore.getState().status).toBe('error');
  });
});
