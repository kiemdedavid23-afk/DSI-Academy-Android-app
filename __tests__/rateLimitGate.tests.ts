import {
  notifyRateLimited,
  isRateLimited,
  msUntilAvailable,
  resetRateLimits,
} from '@core/network/rateLimitGate';

describe('rateLimitGate', () => {
  beforeEach(() => {
    resetRateLimits();
  });

  it('isRateLimited faux par défaut', () => {
    expect(isRateLimited('community')).toBe(false);
    expect(msUntilAvailable('community')).toBe(0);
  });

  it('notifyRateLimited bloque le service pour N secondes', () => {
    notifyRateLimited('community', 2);
    expect(isRateLimited('community')).toBe(true);
    expect(msUntilAvailable('community')).toBeGreaterThan(0);
    expect(isRateLimited('shop')).toBe(false);
  });

  it('secondes invalides → défaut 30 s', () => {
    notifyRateLimited('shop', undefined);
    expect(msUntilAvailable('shop')).toBeGreaterThan(25_000);
    resetRateLimits();
    notifyRateLimited('shop', -1);
    expect(msUntilAvailable('shop')).toBeGreaterThan(25_000);
    resetRateLimits();
    notifyRateLimited('shop', NaN);
    expect(msUntilAvailable('shop')).toBeGreaterThan(25_000);
  });

  it('max des échéances (deux notifies)', () => {
    notifyRateLimited('community', 1);
    const first = msUntilAvailable('community');
    notifyRateLimited('community', 5);
    const second = msUntilAvailable('community');
    expect(second).toBeGreaterThanOrEqual(first);
    expect(second).toBeGreaterThan(4000);
  });

  it('resetRateLimits libère tous les services', () => {
    notifyRateLimited('community', 10);
    notifyRateLimited('shop', 10);
    resetRateLimits();
    expect(isRateLimited('community')).toBe(false);
    expect(isRateLimited('shop')).toBe(false);
  });
});
