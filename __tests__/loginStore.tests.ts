import {loginStore} from '@features/auth/login/store/loginStore';
import * as authApi from '@core/api/endpoints/payment/auth.api';
import {sessionStore} from '@core/session';

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
    connecter.mockReset();
  });

  it('passe en success et ouvre une session', async () => {
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
    await loginStore.submit('a@b.invalid', 'x', true, 'générique');
    expect(loginStore.getState().status).toBe('success');
    expect(sessionStore.hasSession()).toBe(true);
  });

  it('pending_payment expose l’état', async () => {
    connecter.mockResolvedValue({
      kind: 'pendingPayment',
      userId: 'DSI-00000',
      paymentTrackingToken: 'TEST_TRACKING_TOKEN_NOT_REAL',
      paymentMode: 'direct',
      paymentUrl: null,
    });
    await loginStore.submit('a@b.invalid', 'x', false, 'générique');
    expect(loginStore.getState().status).toBe('pendingPayment');
    expect(loginStore.getState().pending?.paymentMode).toBe('direct');
    expect(sessionStore.hasSession()).toBe(false);
  });

  it('refuse affiche le message Worker', async () => {
    connecter.mockResolvedValue({
      kind: 'failure',
      message: 'Identifiant ou mot de passe incorrect.',
    });
    await loginStore.submit('a', 'b', false, 'générique');
    expect(loginStore.getState().status).toBe('error');
    expect(loginStore.getState().error).toBe(
      'Identifiant ou mot de passe incorrect.',
    );
  });

  it('suspendu affiche le message Worker', async () => {
    connecter.mockResolvedValue({
      kind: 'failure',
      message: 'Votre compte est suspendu. Contactez le support.',
    });
    await loginStore.submit('a', 'b', false, 'générique');
    expect(loginStore.getState().error).toContain('suspendu');
  });

  it('bloque le double envoi', async () => {
    let resolveFn: (v: unknown) => void = () => {};
    connecter.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveFn = resolve;
        }) as Promise<never>,
    );
    const p1 = loginStore.submit('a', 'b', false, 'g');
    const p2 = loginStore.submit('a', 'b', false, 'g');
    expect(connecter).toHaveBeenCalledTimes(1);
    resolveFn({
      kind: 'failure',
      message: 'x',
    });
    await Promise.all([p1, p2]);
  });

  it('n’affiche jamais trop d’essais', async () => {
    connecter.mockResolvedValue({
      kind: 'failure',
      message: 'Identifiant ou mot de passe incorrect.',
    });
    await loginStore.submit('a', 'b', false, 'générique');
    expect(loginStore.getState().error).not.toMatch(/trop/i);
  });
});
