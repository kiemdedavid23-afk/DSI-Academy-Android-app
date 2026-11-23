import * as api from '@core/api/endpoints/community/conversations.api';
import {isRateLimited} from '@core/network';
import {chatStore, mergeById, CHAT_PAGE_SIZE} from '../src/features/community/store/chatStore';
import {startDirectChat, createGroupChat} from '../src/features/community/store/conversationActions';
import {conversationsStore} from '../src/features/community/store/conversationsStore';
import {formatListTime} from '../src/features/community/format';

jest.mock('@core/network', () => ({isRateLimited: jest.fn(() => false)}));
jest.mock('@core/session', () => ({
  sessionStore: {
    getAccessProof: jest.fn(() => 'proof.sig'),
    getSession: jest.fn(() => ({subscriptionActive: true})),
    onSessionCleared: jest.fn(),
    expireSession: jest.fn(),
  },
}));
jest.mock('@core/api/endpoints/community/conversations.api', () => ({
  MESSAGE_MAX_LENGTH: 4000,
  listConversations: jest.fn(),
  createDirectConversation: jest.fn(),
  createGroupConversation: jest.fn(),
  fetchMessages: jest.fn(),
  sendMessage: jest.fn(),
}));
jest.mock('@core/api/endpoints/community/me.api', () => ({fetchCommunityMe: jest.fn()}));

const mock = api as jest.Mocked<typeof api>;
const msg = (id: string, createdAt: number, body = id) => ({
  id, authorId: 'DSI-0002', author: null, kind: 'text' as const, body, createdAt,
});
const ok = (items: unknown[]) => ({kind: 'success' as const, items: items as never});
const fail = (code: string) => ({
  kind: 'failure' as const, errorKind: 'forbidden' as const, status: 403, code, field: null, retryAfterSeconds: null,
});
const chat = (id = 'cv_1') => chatStore.getState().chats[id];

beforeEach(() => {
  jest.clearAllMocks();
  (isRateLimited as jest.Mock).mockReturnValue(false);
  chatStore.reset();
  mock.listConversations.mockResolvedValue({kind: 'success', items: []});
});

describe('Fusion des messages', () => {
  it('par identifiant, ordre chronologique, sans doublon', () => {
    const merged = mergeById([msg('b', 2), msg('a', 1)], [msg('b', 2, 'maj'), msg('c', 3)]);
    expect(merged.map(x => x.id)).toEqual(['a', 'b', 'c']);
    expect(merged[1].body).toBe('maj');
  });
});

describe('Discussion ouverte', () => {
  it('ouverture : messages, pas de page plus ancienne sous 50', async () => {
    mock.fetchMessages.mockResolvedValue(ok([msg('a', 1)]));
    await chatStore.open('cv_1');
    expect(chat().status).toBe('ready');
    expect(chat().hasMore).toBe(false);
    expect(mock.fetchMessages).toHaveBeenCalledWith('cv_1', {limit: CHAT_PAGE_SIZE});
  });
  it('page pleine : page plus ancienne demandée avec before = plus ancien affiché', async () => {
    const full = Array.from({length: CHAT_PAGE_SIZE}, (_, i) => msg(`m${i}`, 1000 + i));
    mock.fetchMessages.mockResolvedValueOnce(ok(full));
    await chatStore.open('cv_1');
    expect(chat().hasMore).toBe(true);
    mock.fetchMessages.mockResolvedValueOnce(ok([msg('old', 10)]));
    await chatStore.loadOlder('cv_1');
    expect(mock.fetchMessages).toHaveBeenLastCalledWith('cv_1', {
      limit: CHAT_PAGE_SIZE,
      before: 1000,
    });
    expect(chat().messages[0].id).toBe('old');
    expect(chat().hasMore).toBe(false);
  });
  it('pas membre : état denied', async () => {
    mock.fetchMessages.mockResolvedValue(fail('ACCESS_DENIED'));
    await chatStore.open('cv_x');
    expect(chat('cv_x').status).toBe('denied');
    expect(chat('cv_x').errorKey).toBe('communityApp.errors.accessDenied');
  });
  it('relecture : fusion sans doublon, échec silencieux, pause si débit limité', async () => {
    mock.fetchMessages.mockResolvedValueOnce(ok([msg('a', 1)]));
    await chatStore.open('cv_1');
    mock.fetchMessages.mockResolvedValueOnce(ok([msg('a', 1), msg('b', 2)]));
    await chatStore.poll('cv_1');
    expect(chat().messages.map(x => x.id)).toEqual(['a', 'b']);
    mock.fetchMessages.mockResolvedValueOnce(fail('NETWORK_ERROR'));
    await chatStore.poll('cv_1');
    expect(chat().messages).toHaveLength(2);
    expect(chat().status).toBe('ready');
    (isRateLimited as jest.Mock).mockReturnValue(true);
    mock.fetchMessages.mockClear();
    await chatStore.poll('cv_1');
    expect(mock.fetchMessages).not.toHaveBeenCalled();
  });
});

describe('Envoi', () => {
  beforeEach(async () => {
    mock.fetchMessages.mockResolvedValue(ok([msg('a', 1)]));
    await chatStore.open('cv_1');
    mock.fetchMessages.mockClear();
  });
  it('succès : message ajouté avec l’id et la date reçus, puis relecture', async () => {
    mock.sendMessage.mockResolvedValue({kind: 'success', id: 'msg_new', createdAt: 5000});
    mock.fetchMessages.mockResolvedValue(ok([msg('a', 1)]));
    const r = await chatStore.send('cv_1', '  Bonjour  ', 'DSI-0001');
    expect(r).toEqual({ok: true});
    expect(mock.sendMessage).toHaveBeenCalledWith('cv_1', 'Bonjour');
    const mine = chat().messages.find(x => x.id === 'msg_new');
    expect(mine).toMatchObject({authorId: 'DSI-0001', body: 'Bonjour', createdAt: 5000});
    expect(mock.fetchMessages).toHaveBeenCalled();
  });
  it('échec : un seul appel (jamais rejoué), message d’erreur, aucun message ajouté', async () => {
    mock.sendMessage.mockResolvedValue(fail('CONTACT_REQUIRED'));
    const r = await chatStore.send('cv_1', 'Salut', 'DSI-0001');
    expect(r).toEqual({ok: false, errorKey: 'communityApp.errors.contactRequired'});
    expect(mock.sendMessage).toHaveBeenCalledTimes(1);
    expect(chat().noticeKey).toBe('communityApp.errors.contactRequired');
    expect(chat().messages).toHaveLength(1);
    expect(chat().sending).toBe(false);
  });
  it('vide ou trop long : aucun appel', async () => {
    expect((await chatStore.send('cv_1', '   ', 'DSI-0001')).ok).toBe(false);
    expect((await chatStore.send('cv_1', 'x'.repeat(4001), 'DSI-0001')).ok).toBe(false);
    expect(mock.sendMessage).not.toHaveBeenCalled();
  });
});

describe('Création de discussions', () => {
  it('privée : on ouvre l’id, créée ou existante', async () => {
    mock.createDirectConversation.mockResolvedValue({kind: 'success', id: 'cv_9', existing: true});
    const r = await startDirectChat('DSI-0002');
    expect(r).toEqual({ok: true, id: 'cv_9'});
    expect(mock.listConversations).toHaveBeenCalled();
  });
  it('pas en contact : message dédié, liste non relue', async () => {
    mock.createDirectConversation.mockResolvedValue(fail('CONTACT_REQUIRED'));
    const r = await startDirectChat('DSI-0002');
    expect(r).toEqual({ok: false, errorKey: 'communityApp.errors.contactRequired'});
    expect(mock.listConversations).not.toHaveBeenCalled();
  });
  it('groupe : titre nettoyé', async () => {
    mock.createGroupConversation.mockResolvedValue({kind: 'success', id: 'cv_g', existing: false});
    await createGroupChat('  Les voisins ', ['DSI-0002']);
    expect(mock.createGroupConversation).toHaveBeenCalledWith('Les voisins', ['DSI-0002']);
  });
});

describe('Store des conversations et dates', () => {
  it('échec de la liste : erreur', async () => {
    mock.listConversations.mockResolvedValue(fail('SUBSCRIPTION_INACTIVE') as never);
    conversationsStore.reset();
    await conversationsStore.load({force: true});
    expect(conversationsStore.getState().status).toBe('error');
  });
  it('date de liste : heure le jour même, date courte sinon, vide sans message', () => {
    const now = new Date(2026, 10, 23, 15, 0);
    expect(formatListTime(null, 'fr', now)).toBe('');
    expect(formatListTime(new Date(2026, 10, 23, 9, 5).getTime(), 'fr', now)).toMatch(/09[:h]05/);
    expect(formatListTime(new Date(2026, 10, 1).getTime(), 'fr', now)).toMatch(/1/);
  });
});
