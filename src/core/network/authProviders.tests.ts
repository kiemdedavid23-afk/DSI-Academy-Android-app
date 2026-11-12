import {
  configureHttpAuth,
  getHttpAuthConfig,
  resetHttpAuth,
} from './authProviders';

describe('authProviders', () => {
  afterEach(() => {
    resetHttpAuth();
  });

  it('défaut : jetons null, onUnauthorized no-op', () => {
    const cfg = getHttpAuthConfig();
    expect(cfg.getBearerToken()).toBeNull();
    expect(cfg.getAccessProof()).toBeNull();
    expect(() =>
      cfg.onUnauthorized({
        service: 'payment',
        status: 401,
        code: null,
        auth: 'bearer',
      }),
    ).not.toThrow();
  });

  it('configureHttpAuth branche les fournisseurs', () => {
    const spy = jest.fn();
    configureHttpAuth({
      getBearerToken: () => 'b',
      getAccessProof: () => 'a',
      onUnauthorized: spy,
    });
    const cfg = getHttpAuthConfig();
    expect(cfg.getBearerToken()).toBe('b');
    expect(cfg.getAccessProof()).toBe('a');
    cfg.onUnauthorized({
      service: 'community',
      status: 401,
      code: 'X',
      auth: 'accessProof',
    });
    expect(spy).toHaveBeenCalled();
  });

  it('resetHttpAuth restaure les défauts', () => {
    configureHttpAuth({getBearerToken: () => 'x'});
    resetHttpAuth();
    expect(getHttpAuthConfig().getBearerToken()).toBeNull();
  });
});
