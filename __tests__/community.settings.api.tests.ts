import * as api from '@core/api/endpoints/community/settings.api';
import settings from '../contracts/community/settings.json';
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

const ALL = {
  privacy: {showLastSeen: false, allowDirectMessages: true, allowCalls: true},
  prefs: {notifyMessages: true, notifyCalls: false, notifySpaces: true},
};

describe('Réglages', () => {
  it('lecture : clé absente = activé, valeur enregistrée conservée', async () => {
    m.get.mockReturnValue(res(200, settings));
    const r = await api.fetchSettings();
    expect(r.kind).toBe('success');
    if (r.kind === 'success') {
      expect(r.settings.privacy.showLastSeen).toBe(false);
      expect(r.settings.privacy.allowCalls).toBe(true);
      expect(r.settings.prefs.notifyMessages).toBe(true);
    }
  });
  it('enregistrement : le PUT envoie toujours les six clés, et rien d\'autre', async () => {
    m.put.mockReturnValue(res(200, {success: true, data: {updated: true, ...ALL}}));
    const r = await api.saveSettings({...ALL, extra: true} as never);
    expect(m.put).toHaveBeenCalledWith('/api/community/settings', ALL, AUTH);
    expect(r.kind).toBe('success');
  });
  it('échec : code du Worker conservé, pas de rejeu', async () => {
    m.put.mockReturnValue(res(429, {success: false, error: 'x', code: 'RATE_LIMITED'}));
    const r = await api.saveSettings(ALL);
    expect(r.kind).toBe('failure');
    expect(m.put).toHaveBeenCalledTimes(1);
  });
});
