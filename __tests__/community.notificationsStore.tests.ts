import * as api from '@core/api/endpoints/community/notifications.api';
import {
  communityNotificationsStore,
  markConversationRead,
  markNotificationsRead,
  markSupportRead,
  unreadOf,
} from '../src/features/community/store/communityNotificationsStore';

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
jest.mock('@core/api/endpoints/community/notifications.api', () => ({
  listNotifications: jest.fn(),
  markNotificationRead: jest.fn(() => Promise.resolve({kind: 'success'})),
}));

const mock = api as jest.Mocked<typeof api>;
const n = (id: string, type: 'message.created' | 'support.message', conv: string, read = false) => ({
  id,
  type,
  payload: {conversationId: conv},
  fromDisplayName: '',
  fromPseudonym: '',
  read,
  createdAt: 1,
});

beforeEach(async () => {
  jest.clearAllMocks();
  communityNotificationsStore.reset();
  mock.listNotifications.mockResolvedValue({
    kind: 'success',
    items: [
      n('n1', 'message.created', 'cv_a'),
      n('n2', 'message.created', 'cv_b'),
      n('n3', 'support.message', 'cv_sup'),
      n('n4', 'message.created', 'cv_a', true),
    ],
  });
  await communityNotificationsStore.load({force: true});
});

describe('notifications (store)', () => {
  it('le non-lu est compté localement', () => {
    expect(unreadOf(communityNotificationsStore.getState().data)).toHaveLength(3);
  });
  it('marquer une discussion : seules ses notifications non lues, état local immédiat', async () => {
    await markConversationRead('cv_a');
    expect(mock.markNotificationRead).toHaveBeenCalledTimes(1);
    expect(mock.markNotificationRead).toHaveBeenCalledWith('n1');
    expect(unreadOf(communityNotificationsStore.getState().data).map(x => x.id)).toEqual(['n2', 'n3']);
  });
  it('marquer le Support : seules les notifications support', async () => {
    await markSupportRead();
    expect(mock.markNotificationRead).toHaveBeenCalledWith('n3');
    expect(mock.markNotificationRead).toHaveBeenCalledTimes(1);
  });
  it('doublons d\'identifiants : une seule requête chacun', async () => {
    await markNotificationsRead(['n1', 'n1', 'n2']);
    expect(mock.markNotificationRead).toHaveBeenCalledTimes(2);
  });
});
