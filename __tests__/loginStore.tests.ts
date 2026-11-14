import {loginStore} from '@features/auth/login/store/loginStore';
import * as authApi from '@core/api/endpoints/payment/auth.api';
import {sessionStore, registrationTracking} from '@core/session';
jest.mock('@core/api/endpoints/payment/auth.api');

// eslint-disable-next-line @typescript-eslint/no-require-imports
const keychain = require('react-native-keychain');

const connecter = authApi.connecter as jest.MockedFunction<
  typeof authApi.connecter
>;

describe('loginStore', () => {
  beforeEach(async () => {
    if (typeof keychain.__reset === 'function') {
      keychain.__reset();
    }
    loginStore.reset();
    await sessionStore.clearSessionAsync();
    await registrationTracking.clear();
    connecter.mockReset();
  });

  it('session → success + hasSession + tracking effacé', async () => {
    await registrationTracking.save({
      userId: 'DSI-TRACK',
      paymentTrackingToken: 'TEST_TRACKING_TOKEN_NOT_REAL',
      paymentMode: 'direct',
      paymentUrl: null,
    });
    expect(await registrationTracking.read()).not.toBeNull();

    connecter.mockResolvedValue({
      kind: 'session',
      userId: 'DSI-00000',
      accountStatus: 'actif',
      subscriptionStatus: 'actif',
      subscriptionActive: true,
      dateFin: null,
      token: 'TEST_TOKEN_NOT_REAL',
      expiresIn: 604800,
      accessProof: null,
    });
    await loginStore.submit('a@b.invalid', 'x', true);
    expect(loginStore.getState().status).toBe('success');
    expect(sessionStore.hasSession()).toBe(true);
    expect(await registrationTracking.read()).toBeNull();
  });

  it('pending_payment expose l’état et remplace le tracking', async () => {
    connecter.mockResolvedValue({
      kind: 'pendingPayment',
      userId: 'DSI-00000',
      paymentTrackingToken: 'TEST_TRACKING_TOKEN_NOT_REAL',
      paymentMode: 'direct',
      paymentUrl: null,
    });
    await loginStore.submit('a@b.invalid', 'x', false);
    expect(loginStore.getState().status).toBe('pendingPayment');
    expect(loginStore.getState().pending?.paymentMode).toBe('direct');
    expect(sessionStore.hasSession()).toBe(false);
    const tracking = await registrationTracking.read();
    expect(tracking?.paymentTrackingToken).toBe('TEST_TRACKING_TOKEN_NOT_REAL');
  });

  it('refuse → errorKind credentials + workerMessage', async () => {
    connecter.mockResolvedValue({
      kind: 'failure',
      errorKind: 'credentials',
      message: 'Identifiant ou mot de passe incorrect.',
    });
    await loginStore.submit('a', 'b', false);
    const s = loginStore.getState();
    expect(s.status).toBe('error');
    expect(s.errorKind).toBe('credentials');
    expect(s.workerMessage).toBe('Identifiant ou mot de passe incorrect.');
  });

  it('suspendu → errorKind refused + workerMessage', async () => {
    connecter.mockResolvedValue({
      kind: 'failure',
      errorKind: 'refused',
      message: 'Votre compte est suspendu. Contactez le support.',
    });
    await loginStore.submit('a', 'b', false);
    const s = loginStore.getState();
    expect(s.errorKind).toBe('refused');
    expect(s.workerMessage).toContain('suspendu');
  });

  it('network → errorKind network', async () => {
    connecter.mockResolvedValue({
      kind: 'failure',
      errorKind: 'network',
    });
    await loginStore.submit('a', 'b', false);
    expect(loginStore.getState().errorKind).toBe('network');
    expect(loginStore.getState().workerMessage).toBeNull();
  });

  it('server → errorKind server', async () => {
    connecter.mockResolvedValue({
      kind: 'failure',
      errorKind: 'server',
    });
    await loginStore.submit('a', 'b', false);
    expect(loginStore.getState().errorKind).toBe('server');
  });

  it('bloque le double envoi', async () => {
    let resolveFn: (value: {
      kind: 'failure';
      errorKind: 'credentials';
      message: string;
    }) => void = () => {};
    connecter.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveFn = resolve;
        }),
    );
    const p1 = loginStore.submit('a', 'b', false);
    const p2 = loginStore.submit('a', 'b', false);
    expect(connecter).toHaveBeenCalledTimes(1);
    resolveFn({
      kind: 'failure',
      errorKind: 'credentials',
      message: 'x',
    });
    await Promise.all([p1, p2]);
  });

  it('n’affiche jamais trop d’essais', async () => {
    connecter.mockResolvedValue({
      kind: 'failure',
      errorKind: 'credentials',
      message: 'Identifiant ou mot de passe incorrect.',
    });
    await loginStore.submit('a', 'b', false);
    expect(loginStore.getState().workerMessage).not.toMatch(/trop/i);
  });
});
