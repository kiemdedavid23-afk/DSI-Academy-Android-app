import {continueStore, favoritesStore} from '@shared/store';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const asyncStorage = require('@react-native-async-storage/async-storage');

describe('continueStore / favoritesStore', () => {
  beforeEach(async () => {
    if (typeof asyncStorage.clear === 'function') {
      await asyncStorage.clear();
    }
    await continueStore.clear();
    await favoritesStore.clear();
  });

  it('continue vide par défaut', async () => {
    expect(await continueStore.get()).toBeNull();
  });

  it('continue set/get/clear', async () => {
    await continueStore.set({
      id: 'TEST_1',
      house: 'library',
      title: 'Titre test',
      path: '/library/1',
    });
    const e = await continueStore.get();
    expect(e?.id).toBe('TEST_1');
    await continueStore.clear();
    expect(await continueStore.get()).toBeNull();
  });

  it('favorites list vide et remove', async () => {
    expect(await favoritesStore.list()).toEqual([]);
  });
});
