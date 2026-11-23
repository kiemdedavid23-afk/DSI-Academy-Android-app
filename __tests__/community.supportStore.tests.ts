import * as api from '@core/api/endpoints/community/support.api';
import {supportStore} from '../src/features/community/store/supportStore';

jest.mock('@core/network', () => ({isRateLimited: jest.fn(() => false)}));
jest.mock('@core/session', () => ({
  sessionStore: {
    getAccessProof: jest.fn(() => 'proof.sig'),
    getSession: jest.fn(() => ({subscriptionActive: true})),
    onSessionCleared: jest.fn(),
    expireSession: jest.fn(),
  },
}));
jest.mock('@core/api/endpoints/community/me.api', () => ({fetchCommunityMe: jest.fn()}));
jest.mock('@core/api/endpoints/community/support.api', () => ({
  SUPPORT_MESSAGE_MAX_LENGTH: 4000,
  SUPPORT_MESSAGE_ID_MAX_LENGTH: 64,
  openSupport: jest.fn(),
  fetchSupportMessages: jest.fn(),
  sendSupportMessage: jest.fn(),
}));

const mock = api as jest.Mocked<typeof api>;
const msg = (id: string, createdAt: number, official = false) => ({
  id,
  official,
  displayName: official ? 'Support DSI' : null,
  kind: 'text' as const,
  body: id,
  createdAt,
  deliveredToAdminAt: null,
});
const fail = (errorKind: 'network' | 'validation', code: string | null = null) => ({
  kind: 'failure' as const,
  errorKind,
  status: errorKind === 'network' ? 0 : 422,
  code,
  field: null,
  retryAfterSeconds: null,
});

beforeEach(() => {
  jest.resetAllMocks();
  supportStore.reset();
  mock.openSupport.mockResolvedValue({kind: 'success', thread: {id: 'cv_sup', created: false}});
  mock.fetchSupportMessages.mockResolvedValue({
    kind: 'success',
    items: [msg('a', 1), msg('b', 2, true)],
  });
});

describe('supportStore', () => {
  it('ouvre le fil puis charge les messages', async () => {
    await supportStore.open();
    const s = supportStore.getState();
    expect(s.status).toBe('ready');
    expect(s.messages.map(m => m.id)).toEqual(['a', 'b']);
    expect(s.hasMore).toBe(false);
  });
  it('échec à l\'ouverture : état erreur, aucune lecture de messages', async () => {
    mock.openSupport.mockResolvedValue(fail('network', 'NETWORK_ERROR'));
    await supportStore.open();
    expect(supportStore.getState().status).toBe('error');
    expect(mock.fetchSupportMessages).not.toHaveBeenCalled();
  });
  it('envoi : succès ajouté sans doublon avec la relecture', async () => {
    await supportStore.open();
    mock.sendSupportMessage.mockResolvedValue({
      kind: 'success',
      message: msg('c', 3),
      duplicate: false,
    });
    mock.fetchSupportMessages.mockResolvedValue({
      kind: 'success',
      items: [msg('a', 1), msg('b', 2, true), msg('c', 3)],
    });
    const r = await supportStore.send('  Bonjour  ');
    expect(r.ok).toBe(true);
    expect(mock.sendSupportMessage).toHaveBeenCalledWith(expect.any(String), 'Bonjour');
    await supportStore.poll();
    expect(supportStore.getState().messages.map(m => m.id)).toEqual(['a', 'b', 'c']);
  });
  it('échec non réseau : pas de rejeu, et le même texte reprend le même messageId', async () => {
    await supportStore.open();
    mock.sendSupportMessage.mockResolvedValue(fail('validation', 'VALIDATION'));
    await supportStore.send('Même texte');
    expect(mock.sendSupportMessage).toHaveBeenCalledTimes(1);
    const firstId = mock.sendSupportMessage.mock.calls[0][0];
    await supportStore.send('Même texte');
    expect(mock.sendSupportMessage.mock.calls[1][0]).toBe(firstId);
    await supportStore.send('Autre texte');
    expect(mock.sendSupportMessage.mock.calls[2][0]).not.toBe(firstId);
  });
  it('échec réseau : un seul rejeu, avec le même messageId', async () => {
    await supportStore.open();
    mock.sendSupportMessage
      .mockResolvedValueOnce(fail('network', 'NETWORK_ERROR'))
      .mockResolvedValueOnce({kind: 'success', message: msg('c', 3), duplicate: true});
    const r = await supportStore.send('Bonjour');
    expect(r.ok).toBe(true);
    expect(mock.sendSupportMessage).toHaveBeenCalledTimes(2);
    expect(mock.sendSupportMessage.mock.calls[1][0]).toBe(mock.sendSupportMessage.mock.calls[0][0]);
  });
  it('texte vide ou trop long : aucun appel', async () => {
    await supportStore.open();
    expect((await supportStore.send('   ')).ok).toBe(false);
    expect((await supportStore.send('x'.repeat(4001))).ok).toBe(false);
    expect(mock.sendSupportMessage).not.toHaveBeenCalled();
  });
  it('purge : le fil est vidé', async () => {
    await supportStore.open();
    supportStore.reset();
    expect(supportStore.getState().messages).toEqual([]);
  });
});
