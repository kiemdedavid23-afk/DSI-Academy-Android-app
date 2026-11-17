jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import {cached, clearContentCache, setCacheEnabled} from '@core/cache/diskCache';

const ok = (n: number) => ({kind: 'success' as const, n});
const fail = (errorKind: string) => ({kind: 'failure' as const, errorKind});

describe('diskCache', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(1_000_000);
    setCacheEnabled(true);
    await clearContentCache();
  });
  afterEach(() => {
    setCacheEnabled(false);
    jest.useRealTimers();
  });

  it('sert la copie pendant 24 h puis redemande', async () => {
    const f = jest.fn().mockResolvedValueOnce(ok(1)).mockResolvedValueOnce(ok(2));
    expect(await cached('k', f)).toEqual(ok(1));
    expect(await cached('k', f)).toEqual(ok(1));
    expect(f).toHaveBeenCalledTimes(1);
    jest.setSystemTime(1_000_000 + 25 * 3600_000);
    expect(await cached('k', f)).toEqual(ok(2));
    expect(f).toHaveBeenCalledTimes(2);
  });
  it("renvoie l'ancienne copie sur échec réseau, pas sur introuvable", async () => {
    const f = jest.fn().mockResolvedValueOnce(ok(1)).mockResolvedValueOnce(fail('network')).mockResolvedValueOnce(fail('notFound'));
    await cached('k', f);
    jest.setSystemTime(1_000_000 + 25 * 3600_000);
    expect(await cached('k', f)).toEqual(ok(1));
    expect(await cached('k', f)).toEqual(fail('notFound'));
  });
  it('ne garde pas les échecs et se vide à la demande', async () => {
    const f = jest.fn().mockResolvedValueOnce(fail('server')).mockResolvedValue(ok(3));
    expect(await cached('k', f)).toEqual(fail('server'));
    expect(await cached('k', f)).toEqual(ok(3));
    await clearContentCache();
    await cached('k', f);
    expect(f).toHaveBeenCalledTimes(3);
  });
});
