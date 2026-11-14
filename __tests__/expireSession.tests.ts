import {
  sessionStore,
  sessionEndReason,
  registrationTracking,
  lastLoginIdentifier,
} from '@core/session';
import {createResourceStore, storeRegistry} from '@shared/store';
import {preferencesStore} from '@shared/preferences';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const keychain = require('react-native-keychain');

describe('expireSession', () => {
  beforeEach(async () => {
    if (typeof keychain.__reset === 'function') {
      keychain.__reset();
    }
    storeRegistry.clearRegistry();
    sessionEndReason.clear();
    lastLoginIdentifier.clear();
    await sessionStore.clearSessionAsync();
    await registrationTracking.clear();
  });

  it('loggedOut : pas de message, session et tracking effacés', async () => {
    await sessionStore.setSession(
      {
        token: 'TEST_TOKEN_NOT_REAL',
        userId: 'DSI-00000',
        accountStatus: null,
        subscriptionStatus: null,
        subscriptionActive: true,
        dateFin: null,
        accessProof: 'PROOF',
        expiresIn: 604800,
      },
      true,
    );
    await registrationTracking.save({
      userId: 'DSI-00000',
      paymentTrackingToken: 'TEST_TRACKING_TOKEN_NOT_REAL',
      paymentMode: 'direct',
      paymentUrl: null,
    });
    lastLoginIdentifier.set('user@test.invalid');

    await sessionStore.expireSession('loggedOut');
    expect(sessionStore.hasSession()).toBe(false);
    expect(sessionEndReason.consume()).toBeNull();
    expect(await registrationTracking.read()).toBeNull();
    expect(lastLoginIdentifier.get()).toBeNull();
  });

  it('unauthorized : motif one-shot session expirée', async () => {
    await sessionStore.setSession(
      {
        token: 'TEST_TOKEN_NOT_REAL',
        userId: 'DSI-00000',
        accountStatus: null,
        subscriptionStatus: null,
        subscriptionActive: true,
        dateFin: null,
        accessProof: null,
        expiresIn: 604800,
      },
      false,
    );
    await sessionStore.expireSession('unauthorized');
    expect(sessionStore.hasSession()).toBe(false);
    expect(sessionEndReason.consume()).toBe('unauthorized');
    expect(sessionEndReason.consume()).toBeNull();
  });

  it('401 sans session ignoré', async () => {
    expect(sessionStore.hasSession()).toBe(false);
    await sessionStore.expireSession('unauthorized');
    expect(sessionEndReason.consume()).toBeNull();
  });

  it('idempotence : double appel', async () => {
    await sessionStore.setSession(
      {
        token: 'TEST_TOKEN_NOT_REAL',
        userId: 'DSI-00000',
        accountStatus: null,
        subscriptionStatus: null,
        subscriptionActive: false,
        dateFin: null,
        accessProof: null,
        expiresIn: 604800,
      },
      false,
    );
    await Promise.all([
      sessionStore.expireSession('unauthorized'),
      sessionStore.expireSession('unauthorized'),
    ]);
    expect(sessionEndReason.consume()).toBe('unauthorized');
    expect(sessionEndReason.consume()).toBeNull();
  });

  it('purge les stores via onSessionCleared', async () => {
    const store = createResourceStore({
      ttlMs: 60_000,
      fetcher: async () => ({ok: true}),
    });
    await store.load();
    await sessionStore.setSession(
      {
        token: 'TEST_TOKEN_NOT_REAL',
        userId: 'DSI-00000',
        accountStatus: null,
        subscriptionStatus: null,
        subscriptionActive: true,
        dateFin: null,
        accessProof: null,
        expiresIn: 604800,
      },
      false,
    );
    await sessionStore.expireSession('loggedOut');
    expect(store.getState().data).toBeNull();
  });

  it('conserve les préférences', async () => {
    const before = preferencesStore.get();
    await sessionStore.expireSession('loggedOut');
    expect(preferencesStore.get()).toEqual(before);
  });
});
