import {http} from '@core/network';
import {sessionStore} from '@core/session';
import * as api from '@core/api/endpoints/community/conversations.api';
import list from '../contracts/community/conversations.list.json';
import page from '../contracts/community/messages.page.json';
import created from '../contracts/community/conversations.created.json';
import existing from '../contracts/community/conversations.existing.json';
import sent from '../contracts/community/messages.sent.json';
import contactRequired from '../contracts/community/error.403.contactRequired.json';
import accessDenied from '../contracts/community/error.403.accessDenied.json';
import messageEmpty from '../contracts/community/error.422.messageEmpty.json';

jest.mock('@core/network', () => ({
  http: {service: jest.fn()},
  safeEnvelope: jest.requireActual('@core/network/envelope').safeEnvelope,
}));
jest.mock('@core/session', () => ({sessionStore: {getAccessProof: jest.fn()}}));

const m = {get: jest.fn(), post: jest.fn()};
const res = (status: number, body: unknown) =>
  Promise.resolve({status, ok: status < 300, body, bodyKind: 'json' as const});
const AUTH = {auth: 'accessProof'};

beforeEach(() => {
  Object.values(m).forEach(f => f.mockReset());
  (http.service as jest.Mock).mockReturnValue(m);
  (sessionStore.getAccessProof as jest.Mock).mockReturnValue('proof.sig');
});

describe('Conversations : liste', () => {
  it('trois types, pair seulement pour direct, aperçu null conservé', async () => {
    m.get.mockReturnValue(res(200, list));
    const r = await api.listConversations();
    expect(m.get).toHaveBeenCalledWith('/api/community/conversations', AUTH);
    expect(r.kind).toBe('success');
    if (r.kind === 'success') {
      expect(r.items.map(c => c.type)).toEqual(['direct', 'group', 'space']);
      expect(r.items[0].peer?.publicPseudonym).toBe('@moussa');
      expect(r.items[1].peer).toBeNull();
      expect(r.items[1].lastMessage).toBeNull();
      expect(r.items[1].lastMessageAt).toBe(1750000200000);
    }
  });
  it('type inconnu ignoré', async () => {
    m.get.mockReturnValue(
      res(200, {success: true, data: {items: [{id: 'x', type: 'autre', title: 't'}]}}),
    );
    const r = await api.listConversations();
    expect(r.kind === 'success' && r.items).toEqual([]);
  });
});

describe('Conversations : création', () => {
  it('privée : exactement un membre ; créée ou existante, on ouvre l’id', async () => {
    m.post.mockReturnValueOnce(res(201, created)).mockReturnValueOnce(res(200, existing));
    const a = await api.createDirectConversation('DSI-0002');
    const b = await api.createDirectConversation('DSI-0002');
    expect(m.post).toHaveBeenCalledWith(
      '/api/community/conversations',
      {type: 'direct', memberIds: ['DSI-0002']},
      AUTH,
    );
    expect(a.kind === 'success' && a.existing).toBe(false);
    expect(b.kind === 'success' && b.existing).toBe(true);
    expect(b.kind === 'success' && b.id).toBe('cv_ab12cd34ef56');
  });
  it('pas contacts : CONTACT_REQUIRED', async () => {
    m.post.mockReturnValue(res(403, contactRequired));
    const r = await api.createDirectConversation('DSI-0002');
    expect(r.kind === 'failure' && r.code).toBe('CONTACT_REQUIRED');
  });
  it('groupe : titre facultatif, membres par identifiant', async () => {
    m.post.mockReturnValue(res(201, {success: true, data: {id: 'cv_g2', title: 'X'}}));
    await api.createGroupConversation('Les voisins', ['DSI-0002', 'DSI-0003']);
    await api.createGroupConversation('', ['DSI-0002']);
    expect(m.post).toHaveBeenNthCalledWith(
      1,
      '/api/community/conversations',
      {type: 'group', memberIds: ['DSI-0002', 'DSI-0003'], title: 'Les voisins'},
      AUTH,
    );
    expect(m.post.mock.calls[1][1]).toEqual({type: 'group', memberIds: ['DSI-0002']});
  });
});

describe('Messages', () => {
  it('lecture : page, du plus ancien au plus récent, pièce jointe seule = file', async () => {
    m.get.mockReturnValue(res(200, page));
    const r = await api.fetchMessages('cv_1', {limit: 50, before: 1750000100000});
    expect(m.get).toHaveBeenCalledWith('/api/community/conversations/cv_1/messages', {
      auth: 'accessProof',
      query: {limit: 50, before: 1750000100000},
    });
    expect(r.kind).toBe('success');
    if (r.kind === 'success') {
      expect(r.items.map(x => x.id)).toEqual(['msg_a', 'msg_b']);
      expect(r.items[1].kind).toBe('file');
      expect(r.items[1].author).toBeNull();
      expect(r.items[0].author?.displayName).toBe('Moussa');
    }
  });
  it('ordre normalisé même si le Worker renvoie l’inverse', async () => {
    const reversed = {success: true, data: {items: [...page.data.items].reverse()}};
    m.get.mockReturnValue(res(200, reversed));
    const r = await api.fetchMessages('cv_1');
    expect(r.kind === 'success' && r.items.map(x => x.id)).toEqual(['msg_a', 'msg_b']);
  });
  it('pas membre de la conversation : ACCESS_DENIED', async () => {
    m.get.mockReturnValue(res(403, accessDenied));
    const r = await api.fetchMessages('cv_x');
    expect(r.kind === 'failure' && r.code).toBe('ACCESS_DENIED');
  });
  it('envoi : texte seul, id et date reçus', async () => {
    m.post.mockReturnValue(res(201, sent));
    const r = await api.sendMessage('cv_1', 'Bonjour');
    expect(m.post).toHaveBeenCalledWith(
      '/api/community/conversations/cv_1/messages',
      {text: 'Bonjour'},
      AUTH,
    );
    expect(r.kind === 'success' && r.id).toBe('msg_new');
    expect(r.kind === 'success' && r.createdAt).toBe(1750000300000);
  });
  it('message vide refusé par le Worker : validation', async () => {
    m.post.mockReturnValue(res(422, messageEmpty));
    const r = await api.sendMessage('cv_1', ' ');
    expect(r.kind === 'failure' && r.errorKind).toBe('validation');
  });
  it('sans preuve : aucun appel', async () => {
    (sessionStore.getAccessProof as jest.Mock).mockReturnValue(null);
    const r = await api.sendMessage('cv_1', 'x');
    expect(r.kind === 'failure' && r.errorKind).toBe('noProof');
    expect(m.post).not.toHaveBeenCalled();
  });
});
