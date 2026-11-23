import * as api from '@core/api/endpoints/community/notifications.api';
import list from '../contracts/community/notifications.list.json';
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

describe('Notifications', () => {
  it('lit les notifications, écarte les types inconnus, trie du plus récent au plus ancien', async () => {
    m.get.mockReturnValue(res(200, list));
    const r = await api.listNotifications();
    expect(m.get).toHaveBeenCalledWith('/api/community/notifications', AUTH);
    expect(r.kind).toBe('success');
    if (r.kind === 'success') {
      expect(r.items.map(n => n.id)).toEqual(['n_1', 'n_2', 'n_3']);
      expect(r.items[0].read).toBe(false);
      expect(r.items[0].payload.conversationId).toBe('cv_ab12');
      expect(r.items[1].read).toBe(true);
    }
  });
  it('marquer lue : une requête par identifiant, identifiant encodé', async () => {
    m.post.mockReturnValue(res(200, {success: true, data: {id: 'n_1', read: true}}));
    const r = await api.markNotificationRead('n_1');
    expect(m.post).toHaveBeenCalledWith('/api/community/notifications/n_1/read', undefined, AUTH);
    expect(r.kind).toBe('success');
  });
  it('sans preuve d\'accès : aucun appel réseau', async () => {
    (sessionStore.getAccessProof as jest.Mock).mockReturnValue(null);
    const r = await api.listNotifications();
    expect(r.kind).toBe('failure');
    expect(m.get).not.toHaveBeenCalled();
  });
});
