import {registerBrowserStore} from '@features/auth/registration-browser/store/registerBrowserStore';
import {lastLoginIdentifier} from '@core/session';
import {Linking} from 'react-native';
import {BUILD_CONFIG} from '@core/config/buildConfig.generated';

jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);

describe('registerBrowserStore', () => {
  beforeEach(() => {
    registerBrowserStore.reset();
    lastLoginIdentifier.clear();
    (Linking.openURL as jest.Mock).mockClear();
  });

  it('prepare new → loading puis startUrl site', async () => {
    await registerBrowserStore.prepare('new');
    const s = registerBrowserStore.getState();
    expect(s.status).toBe('loading');
    expect(s.startUrl).toContain('/inscription?embed=app');
    expect(s.injectedScript).toBeNull();
  });

  it('markReady / markError / retry', async () => {
    await registerBrowserStore.prepare('new');
    registerBrowserStore.markReady();
    expect(registerBrowserStore.getState().status).toBe('ready');
    registerBrowserStore.markError();
    expect(registerBrowserStore.getState().status).toBe('error');
    registerBrowserStore.retry();
    expect(registerBrowserStore.getState().status).toBe('loading');
  });

  it('handleShouldStart ouvre Linking pour https hors site', () => {
    const ok = registerBrowserStore.handleShouldStart(
      'https://pay.example.invalid/x',
    );
    expect(ok).toBe(false);
    expect(Linking.openURL).toHaveBeenCalledWith(
      'https://pay.example.invalid/x',
    );
  });

  it('handleMessage valide préremplit et done', async () => {
    await registerBrowserStore.prepare('new');
    const origin = `${BUILD_CONFIG.registry.web.replace(/\/+$/, '')}/inscription`;
    const done = registerBrowserStore.handleMessage(
      JSON.stringify({
        type: 'dsi:registration-done',
        identifiant: 'user@test.invalid',
      }),
      origin,
    );
    expect(done).toBe(true);
    expect(registerBrowserStore.getState().prefillIdentifiant).toBe(
      'user@test.invalid',
    );
  });

  it('getInjectedScript est idempotent (deux lectures = même script)', async () => {
    // Forcer un script via prepare resume nécessite tracking ; on set via prepare new puis injection manuelle n'est pas exposée.
    // prepare('new') laisse injectedScript null — deux lectures restent null.
    await registerBrowserStore.prepare('new');
    const a = registerBrowserStore.getInjectedScript();
    const b = registerBrowserStore.getInjectedScript();
    expect(a).toBe(b);
    expect(a).toBeNull();
  });

});
