import * as api from '@core/api/endpoints/community/support.api';
import thread from '../contracts/community/support.thread.json';
import messages from '../contracts/community/support.messages.json';
import sent from '../contracts/community/support.sent.json';
import duplicate from '../contracts/community/support.sent.duplicate.json';
import {http} from '@core/network';
import {sessionStore} from '@core/session';

jest.mock('@core/network', () => ({
  http: {service: jest.fn()},
  safeEnvelope: jest.requireActual('@core/network/envelope').safeEnvelope,
}));
jest.mock('@core/session', () => ({sessionStore: {getAccessProof: jest.fn()}}));

const m = {get: jest.fn(), post: jest.fn(), put: jest.fn()};
const res = (status: number, body: unknown) =>
  Promise.resolve({status, ok: status < 300, body, bodyKind: 'json' as const});
const AUTH = {auth: 'accessProof'};

beforeEach(() => {
  Object.values(m).forEach(f => f.mockReset());
  (http.service as jest.Mock).mockReturnValue(m);
  (sessionStore.getAccessProof as jest.Mock).mockReturnValue('proof.sig');
});

describe('Support DSI : API', () => {
  it('ouvre le fil (GET /support)', async () => {
    m.get.mockReturnValue(res(201, thread));
    const r = await api.openSupport();
    expect(m.get).toHaveBeenCalledWith('/api/community/support', AUTH);
    expect(r.kind === 'success' && r.thread).toEqual({id: 'cv_sup', created: true});
  });
  it('messages : ordre inversé du Worker normalisé (du plus ancien au plus récent)', async () => {
    m.get.mockReturnValue(res(200, messages));
    const r = await api.fetchSupportMessages({limit: 50, before: 1750000500000});
    expect(m.get).toHaveBeenCalledWith('/api/community/support/messages', {
      ...AUTH,
      query: {limit: 50, before: 1750000500000},
    });
    if (r.kind !== 'success') {
      throw new Error('échec inattendu');
    }
    expect(r.items.map(x => x.id)).toEqual(['sm_1', 'sm_2', 'sm_3']);
    expect(r.items[2].official).toBe(true);
    expect(r.items[1].deliveredToAdminAt).toBe(1750000250000);
  });
  it('envoi : clé body + messageId, jamais text', async () => {
    m.post.mockReturnValue(res(201, sent));
    const r = await api.sendSupportMessage('app_abc', 'Merci');
    expect(m.post).toHaveBeenCalledWith(
      '/api/community/support/messages',
      {body: 'Merci', messageId: 'app_abc'},
      AUTH,
    );
    expect(r.kind === 'success' && r.duplicate).toBe(false);
  });
  it('rejeu du même messageId : duplicate = true, même message', async () => {
    m.post.mockReturnValue(res(200, duplicate));
    const r = await api.sendSupportMessage('app_abc', 'Merci');
    expect(r.kind === 'success' && r.duplicate).toBe(true);
    expect(r.kind === 'success' && r.message.id).toBe('sm_9');
  });
});
