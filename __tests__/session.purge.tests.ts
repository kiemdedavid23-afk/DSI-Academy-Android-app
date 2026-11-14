/**
 * clearSession déclenche la purge des stores via onSessionCleared
 * (core n'importe pas shared).
 */

import {sessionStore} from '@core/session';
import {createResourceStore, storeRegistry} from '@shared/store';

describe('session purge', () => {
  beforeEach(async () => {
    storeRegistry.clearRegistry();
    await sessionStore.clearSessionAsync();
  });

  it('onSessionCleared est appelé par clearSession', () => {
    const spy = jest.fn();
    const unsub = sessionStore.onSessionCleared(spy);
    sessionStore.clearSession();
    expect(spy).toHaveBeenCalledTimes(1);
    unsub();
  });

  it('clearSession purge un store enregistré', async () => {
    const store = createResourceStore({
      ttlMs: 60_000,
      fetcher: async () => ({ok: true}),
    });
    await store.load();
    expect(store.getState().data).toEqual({ok: true});

    sessionStore.clearSession();
    expect(store.getState().data).toBeNull();
    expect(store.getState().status).toBe('idle');
  });

  it('hasSession false puis true après setSession explicite', async () => {
    expect(sessionStore.hasSession()).toBe(false);
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
    expect(sessionStore.hasSession()).toBe(true);
    sessionStore.clearSession();
    expect(sessionStore.hasSession()).toBe(false);
  });
});
