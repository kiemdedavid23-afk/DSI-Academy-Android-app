import {createResourceStore} from './createResourceStore';

describe('createResourceStore : instantané stable', () => {
  it('getState() renvoie la même référence tant que rien ne change', () => {
    const store = createResourceStore<number>({
      ttlMs: 1000,
      fetcher: async () => 1,
    });
    expect(store.getState()).toBe(store.getState());
  });

  it('getState() change de référence après un chargement', async () => {
    const store = createResourceStore<number>({
      ttlMs: 1000,
      fetcher: async () => 1,
    });
    const before = store.getState();
    await store.load();
    const after = store.getState();
    expect(after).not.toBe(before);
    expect(after.data).toBe(1);
    expect(store.getState()).toBe(after);
  });
});
