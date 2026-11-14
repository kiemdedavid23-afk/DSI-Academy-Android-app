import {sessionStore} from '@core/session';
import {
  configureHttpAuth,
  getHttpAuthConfig,
  resetHttpAuth,
} from '@core/network/authProviders';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const keychain = require('react-native-keychain');

describe('http auth branching', () => {
  beforeEach(async () => {
    if (typeof keychain.__reset === 'function') {
      keychain.__reset();
    }
    resetHttpAuth();
    await sessionStore.clearSessionAsync();
    // rebind as module load would
    configureHttpAuth({
      getBearerToken: () => sessionStore.getToken(),
      getAccessProof: () => sessionStore.getAccessProof(),
      onUnauthorized: ctx => {
        if (ctx.auth === 'bearer') {
          void sessionStore.expireSession('unauthorized');
        }
      },
    });
  });

  it('lit le jeton à chaque appel', async () => {
    expect(getHttpAuthConfig().getBearerToken()).toBeNull();
    await sessionStore.setSession(
      {
        token: 'TEST_TOKEN_NOT_REAL',
        userId: 'DSI-00000',
        accountStatus: null,
        subscriptionStatus: null,
        subscriptionActive: true,
        dateFin: null,
        accessProof: 'PROOF',
        expiresIn: 604800,
      },
      false,
    );
    expect(getHttpAuthConfig().getBearerToken()).toBe('TEST_TOKEN_NOT_REAL');
    expect(getHttpAuthConfig().getAccessProof()).toBe('PROOF');
  });

  it('401 bearer → fin de session', async () => {
    await sessionStore.setSession(
      {
        token: 'TEST_TOKEN_NOT_REAL',
        userId: 'DSI-00000',
        accountStatus: null,
        subscriptionStatus: null,
        subscriptionActive: true,
        dateFin: null,
        accessProof: null,
        expiresIn: 604800,
      },
      false,
    );
    getHttpAuthConfig().onUnauthorized({
      service: 'payment',
      status: 401,
      code: null,
      auth: 'bearer',
    });
    // expireSession is async
    await new Promise(r => setTimeout(r, 0));
    expect(sessionStore.hasSession()).toBe(false);
  });

  it('401 accessProof → pas de fin de session', async () => {
    await sessionStore.setSession(
      {
        token: 'TEST_TOKEN_NOT_REAL',
        userId: 'DSI-00000',
        accountStatus: null,
        subscriptionStatus: null,
        subscriptionActive: true,
        dateFin: null,
        accessProof: null,
        expiresIn: 604800,
      },
      false,
    );
    getHttpAuthConfig().onUnauthorized({
      service: 'community',
      status: 401,
      code: null,
      auth: 'accessProof',
    });
    await new Promise(r => setTimeout(r, 0));
    expect(sessionStore.hasSession()).toBe(true);
  });
});
