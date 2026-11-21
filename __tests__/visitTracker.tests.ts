jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@core/api/endpoints/marketplace/seller/seller.api', () => ({
  trackVisit: jest.fn(async () => ({ok: true})),
}));
jest.mock('@shared/store/connectivityStore', () => ({
  connectivityStore: {getStatus: jest.fn(() => 'online')},
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {trackVisit} from '@core/api/endpoints/marketplace/seller/seller.api';
import {connectivityStore} from '@shared/store/connectivityStore';
import {
  TRACK_DEDUP_MS,
  VISITOR_KEY_STORAGE,
  createVisitorKey,
  getVisitorKey,
  isVisitorKey,
  resetVisitTrackerForTests,
  trackMarketplaceVisit,
} from '../src/features/commerce/store/visitTracker';

const track = trackVisit as jest.Mock;
const status = connectivityStore.getStatus as jest.Mock;

beforeEach(async () => {
  await AsyncStorage.clear();
  resetVisitTrackerForTests();
  track.mockClear();
  status.mockReturnValue('online');
});

describe('clé visiteur', () => {
  it('génère un UUID v4 valide', () => {
    for (let i = 0; i < 20; i += 1) {
      expect(isVisitorKey(createVisitorKey())).toBe(true);
    }
  });

  it('est créée une fois puis relue', async () => {
    const a = await getVisitorKey();
    resetVisitTrackerForTests();
    expect(await getVisitorKey()).toBe(a);
  });

  it('remplace une valeur stockée invalide', async () => {
    await AsyncStorage.setItem(VISITOR_KEY_STORAGE, JSON.stringify('nope'));
    expect(isVisitorKey(await getVisitorKey())).toBe(true);
  });
});

describe('trackMarketplaceVisit', () => {
  it('envoie la visite avec la clé', async () => {
    await trackMarketplaceVisit('listing_view', 'lst_1');
    expect(track).toHaveBeenCalledTimes(1);
    const [kind, id, key] = track.mock.calls[0];
    expect([kind, id]).toEqual(['listing_view', 'lst_1']);
    expect(isVisitorKey(key)).toBe(true);
  });

  it('n’envoie rien hors-ligne', async () => {
    status.mockReturnValue('offline');
    await trackMarketplaceVisit('listing_view', 'lst_1');
    expect(track).not.toHaveBeenCalled();
  });

  it('dédoublonne 30 minutes puis renvoie', async () => {
    await trackMarketplaceVisit('listing_view', 'lst_1', 1000);
    await trackMarketplaceVisit('listing_view', 'lst_1', 2000);
    await trackMarketplaceVisit('store_view', 'lst_1', 2000);
    expect(track).toHaveBeenCalledTimes(2);
    await trackMarketplaceVisit('listing_view', 'lst_1', 1000 + TRACK_DEDUP_MS);
    expect(track).toHaveBeenCalledTimes(3);
  });

  it('ignore une cible vide et ne lève jamais', async () => {
    await trackMarketplaceVisit('listing_view', '');
    expect(track).not.toHaveBeenCalled();
    track.mockRejectedValueOnce(new Error('boom'));
    await expect(
      trackMarketplaceVisit('listing_view', 'lst_2'),
    ).resolves.toBeUndefined();
  });
});
