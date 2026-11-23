import {http} from '@core/network';
import {sessionStore} from '@core/session';
import * as api from '@core/api/endpoints/community/contacts.api';
import list from '../contracts/community/contacts.list.json';
import requests from '../contracts/community/contacts.requests.json';
import created from '../contracts/community/contacts.request.created.json';
import duplicate from '../contracts/community/contacts.request.duplicate.json';
import cross from '../contracts/community/contacts.request.cross.json';
import already from '../contracts/community/contacts.request.alreadyContacts.json';
import blocked from '../contracts/community/error.403.interactionUnavailable.json';
import invalid from '../contracts/community/error.409.invalidState.json';

jest.mock('@core/network', () => ({
  http: {service: jest.fn()},
  safeEnvelope: jest.requireActual('@core/network/envelope').safeEnvelope,
}));
jest.mock('@core/session', () => ({sessionStore: {getAccessProof: jest.fn()}}));

const m = {get: jest.fn(), post: jest.fn(), delete: jest.fn()};
const res = (status: number, body: unknown) =>
  Promise.resolve({status, ok: status < 300, body, bodyKind: 'json' as const});
const AUTH = {auth: 'accessProof'};

beforeEach(() => {
  Object.values(m).forEach(f => f.mockReset());
  (http.service as jest.Mock).mockReturnValue(m);
  (sessionStore.getAccessProof as jest.Mock).mockReturnValue('proof.sig');
});

describe('Contacts : lectures', () => {
  it('liste : relation, membre, date en millisecondes', async () => {
    m.get.mockReturnValue(res(200, list));
    const r = await api.fetchContacts();
    expect(m.get).toHaveBeenCalledWith('/api/community/contacts', AUTH);
    expect(r.kind === 'success' && r.items[0]).toMatchObject({
      relationId: 'rel_1',
      contactSince: 1750000500000,
      peer: {userId: 'DSI-0002', publicPseudonym: '@moussa'},
    });
  });
  it('demandes : l’identifiant de relation est `id` ; peerId sert de repli', async () => {
    m.get.mockReturnValue(res(200, requests));
    const r = await api.fetchContactRequests();
    expect(r.kind).toBe('success');
    if (r.kind === 'success') {
      expect(r.requests.incoming[0].relationId).toBe('rel_2');
      expect(r.requests.outgoing[0].relationId).toBe('rel_3');
      expect(r.requests.outgoing[0].peer.userId).toBe('DSI-0004');
    }
  });
});

describe('Contacts : demande, quatre issues distinctes', () => {
  const cases: Array<[string, unknown, string]> = [
    ['créée', created, 'created'],
    ['déjà envoyée', duplicate, 'duplicate'],
    ['croisée acceptée d’office', cross, 'cross'],
    ['déjà contacts', already, 'alreadyContacts'],
  ];
  it.each(cases)('%s', async (_n, body, outcome) => {
    m.post.mockReturnValue(res(200, body));
    const r = await api.requestContact('DSI-0002');
    expect(r.kind === 'success' && r.outcome).toBe(outcome);
    expect(m.post).toHaveBeenCalledWith(
      '/api/community/contacts/request',
      {userId: 'DSI-0002'},
      AUTH,
    );
  });
  it('blocage : INTERACTION_UNAVAILABLE reste neutre (interdit)', async () => {
    m.post.mockReturnValue(res(403, blocked));
    const r = await api.requestContact('DSI-0002');
    expect(r.kind === 'failure' && r.errorKind).toBe('forbidden');
    expect(r.kind === 'failure' && r.code).toBe('INTERACTION_UNAVAILABLE');
  });
});

describe('Contacts : routes d’écriture', () => {
  it('accepter, refuser, annuler', async () => {
    m.post.mockReturnValue(res(200, {success: true, data: {}}));
    m.delete.mockReturnValue(res(200, {success: true, data: {cancelled: true}}));
    await api.acceptContactRequest('rel_2');
    await api.rejectContactRequest('rel_2');
    await api.cancelContactRequest('rel_3');
    expect(m.post).toHaveBeenNthCalledWith(1, '/api/community/contacts/requests/rel_2/accept', undefined, AUTH);
    expect(m.post).toHaveBeenNthCalledWith(2, '/api/community/contacts/requests/rel_2/reject', undefined, AUTH);
    expect(m.delete).toHaveBeenCalledWith('/api/community/contacts/requests/rel_3', AUTH);
  });
  it('déjà traitée : 409 INVALID_STATE', async () => {
    m.post.mockReturnValue(res(409, invalid));
    const r = await api.acceptContactRequest('rel_2');
    expect(r.kind === 'failure' && r.errorKind).toBe('conflict');
  });
  it('retirer : référence encodée ; bloquer et débloquer : peerId', async () => {
    m.delete.mockReturnValue(res(200, {success: true, data: {removed: true}}));
    m.post.mockReturnValue(res(200, {success: true, data: {}}));
    await api.removeContact('DSI-0002');
    await api.blockMember('DSI-0002');
    await api.unblockMember('DSI-0002');
    expect(m.delete).toHaveBeenCalledWith('/api/community/contacts/DSI-0002', AUTH);
    expect(m.post).toHaveBeenNthCalledWith(1, '/api/community/contacts/block', {peerId: 'DSI-0002'}, AUTH);
    expect(m.post).toHaveBeenNthCalledWith(2, '/api/community/contacts/unblock', {peerId: 'DSI-0002'}, AUTH);
  });
  it('sans preuve : aucune écriture', async () => {
    (sessionStore.getAccessProof as jest.Mock).mockReturnValue(null);
    const r = await api.blockMember('DSI-0002');
    expect(r.kind === 'failure' && r.errorKind).toBe('noProof');
    expect(m.post).not.toHaveBeenCalled();
  });
});
