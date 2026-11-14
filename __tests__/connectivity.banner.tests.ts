/**
 * Tests connectivityStore + bannerStore (anti-clignotement, une bannière, reduceMotion side via store).
 * NetInfo est mocké — rien d'exécuté hors jest.
 */

import {bannerStore} from '../src/shared/store/bannerStore';
import {connectivityStore} from '../src/shared/store/connectivityStore';

jest.mock('@react-native-community/netinfo', () => {
  let listener: ((s: any) => void) | null = null;
  return {
    __esModule: true,
    default: {
      fetch: jest.fn(() =>
        Promise.resolve({
          isConnected: true,
          isInternetReachable: true,
          type: 'wifi',
        }),
      ),
      addEventListener: jest.fn((cb: (s: any) => void) => {
        listener = cb;
        return () => {
          listener = null;
        };
      }),
      __emit: (state: any) => {
        if (listener) {
          listener(state);
        }
      },
    },
  };
});

const NetInfo = require('@react-native-community/netinfo').default;

describe('bannerStore', () => {
  beforeEach(() => {
    bannerStore.dismiss();
  });

  it('montre une seule bannière et remplace la précédente du même type', () => {
    bannerStore.show({
      type: 't',
      tone: 'info',
      title: 'A',
      message: 'm',
      dismissible: true,
    });
    expect(bannerStore.get()?.title).toBe('A');
    bannerStore.show({
      type: 't',
      tone: 'info',
      title: 'B',
      message: 'm2',
      dismissible: true,
    });
    expect(bannerStore.get()?.title).toBe('B');
  });

  it('dismiss par id', () => {
    bannerStore.show({
      id: 'x1',
      type: 't',
      tone: 'info',
      title: 'A',
      message: 'm',
      dismissible: true,
    });
    bannerStore.dismiss('other');
    expect(bannerStore.get()?.id).toBe('x1');
    bannerStore.dismiss('x1');
    expect(bannerStore.get()).toBeNull();
  });
});

describe('connectivityStore', () => {
  beforeEach(() => {
    connectivityStore._resetForTests();
    bannerStore.dismiss();
    jest.useFakeTimers();
  });

  afterEach(() => {
    connectivityStore._resetForTests();
    jest.useRealTimers();
  });

  it('ne montre pas de bannière au démarrage si en ligne', async () => {
    connectivityStore.start();
    await Promise.resolve();
    expect(connectivityStore.getStatus()).toBe('online');
    expect(bannerStore.get()).toBeNull();
  });

  it('debounce hors-ligne ~1,5 s', async () => {
    NetInfo.fetch.mockResolvedValueOnce({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    });
    connectivityStore.start();
    await Promise.resolve();
    NetInfo.__emit({
      isConnected: false,
      isInternetReachable: false,
      type: 'none',
    });
    expect(bannerStore.get()).toBeNull();
    jest.advanceTimersByTime(1490);
    expect(bannerStore.get()).toBeNull();
    jest.advanceTimersByTime(20);
    expect(bannerStore.get()?.type).toBe('connectivity-offline');
    expect(bannerStore.get()?.dismissible).toBe(false);
  });

  it('retour en ligne : bannière succès et callback', async () => {
    const onOnline = jest.fn();
    connectivityStore.onReconnected(onOnline);
    NetInfo.fetch.mockResolvedValueOnce({
      isConnected: false,
      isInternetReachable: false,
      type: 'none',
    });
    connectivityStore.start();
    await Promise.resolve();
    expect(connectivityStore.getStatus()).toBe('offline');

    NetInfo.__emit({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    });
    expect(connectivityStore.getStatus()).toBe('online');
    expect(bannerStore.get()?.type).toBe('connectivity-online');
    expect(onOnline).toHaveBeenCalled();
  });
});
