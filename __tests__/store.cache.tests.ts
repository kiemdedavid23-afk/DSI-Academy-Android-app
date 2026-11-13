/**
 * Tests de la fabrique de cache : TTL, rafraîchissement, dédoublonnage,
 * invalidation, purge globale, erreur avec cache conservé.
 */

import {createResourceStore, storeRegistry} from '@shared/store';
import {sessionStore} from '@core/session';

describe('createResourceStore', () => {
  let now = 1_000_000;

  beforeEach(() => {
    storeRegistry.clearRegistry();
    sessionStore.setSessionPresent(false);
    now = 1_000_000;
  });

  function clock() {
    return now;
  }

  it('charge et met en cache', async () => {
    let calls = 0;
    const store = createResourceStore({
      ttlMs: 10_000,
      now: clock,
      fetcher: async () => {
        calls += 1;
        return {value: 42};
      },
    });

    await store.load();
    expect(store.getState().status).toBe('success');
    expect(store.getState().data).toEqual({value: 42});
    expect(calls).toBe(1);

    await store.load();
    expect(calls).toBe(1);
  });

  it('rafraîchit en arrière-plan quand le TTL est dépassé', async () => {
    let calls = 0;
    const store = createResourceStore({
      ttlMs: 5_000,
      now: clock,
      fetcher: async () => {
        calls += 1;
        return {n: calls};
      },
    });

    await store.load();
    expect(store.getState().data).toEqual({n: 1});

    now += 6_000;
    await store.load();
    expect(calls).toBe(2);
    expect(store.getState().data).toEqual({n: 2});
  });

  it('dédoublonne les requêtes simultanées', async () => {
    let calls = 0;
    let resolveFetch: (v: string) => void = () => {};
    const store = createResourceStore({
      ttlMs: 60_000,
      now: clock,
      fetcher: () =>
        new Promise<string>(resolve => {
          calls += 1;
          resolveFetch = resolve;
        }),
    });

    const p1 = store.load();
    const p2 = store.load();
    expect(calls).toBe(1);
    resolveFetch('ok');
    await Promise.all([p1, p2]);
    expect(store.getState().data).toBe('ok');
    expect(calls).toBe(1);
  });

  it('invalidate force un nouvel appel', async () => {
    let calls = 0;
    const store = createResourceStore({
      ttlMs: 60_000,
      now: clock,
      fetcher: async () => {
        calls += 1;
        return calls;
      },
    });
    await store.load();
    store.invalidate();
    await store.load();
    expect(calls).toBe(2);
  });

  it('conserve le cache en cas d’erreur de rafraîchissement', async () => {
    let fail = false;
    const store = createResourceStore({
      ttlMs: 1,
      now: clock,
      fetcher: async () => {
        if (fail) {
          throw new Error('réseau');
        }
        return 'données';
      },
    });
    await store.load();
    expect(store.getState().data).toBe('données');

    now += 10;
    fail = true;
    await store.load();
    expect(store.getState().data).toBe('données');
    expect(store.getState().status).toBe('error');
    expect(store.getState().error).toBe('réseau');
  });

  it('clearSession purge les stores enregistrés', async () => {
    const store = createResourceStore({
      ttlMs: 60_000,
      now: clock,
      fetcher: async () => 'x',
    });
    await store.load();
    expect(store.getState().data).toBe('x');

    sessionStore.clearSession();
    expect(store.getState().data).toBeNull();
    expect(store.getState().status).toBe('idle');
  });

  it('reset remet l’état idle', async () => {
    const store = createResourceStore({
      ttlMs: 60_000,
      now: clock,
      fetcher: async () => 1,
    });
    await store.load();
    store.reset();
    expect(store.getState()).toEqual({
      data: null,
      status: 'idle',
      error: null,
      updatedAt: null,
    });
  });
});
