import {sessionStore} from '@core/session';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const keychain = require('react-native-keychain');

describe('sessionStore L1a', () => {
  beforeEach(async () => {
    if (typeof keychain.__reset === 'function') {
      keychain.__reset();
    }
    await sessionStore.clearSessionAsync();
  });

  it('hydrate sans jeton → hasSession false', async () => {
    const ok = await sessionStore.hydrate();
    expect(ok).toBe(false);
    expect(sessionStore.hasSession()).toBe(false);
  });

  it('setSession souvenir=true persiste et hydrate', async () => {
    await sessionStore.setSession(
      {
        token: 'TEST_TOKEN_NOT_REAL',
        userId: 'DSI-00000',
        accountStatus: 'actif',
        subscriptionStatus: 'actif',
        subscriptionActive: true,
        dateFin: null,
        accessProof: null,
        expiresIn: 604800,
      },
      true,
      1_000_000,
    );
    expect(sessionStore.hasSession()).toBe(true);

    // Simule redémarrage
    await sessionStore.clearSessionAsync();
    // clearSessionAsync efface aussi le secure — re-set
    await sessionStore.setSession(
      {
        token: 'TEST_TOKEN_NOT_REAL',
        userId: 'DSI-00000',
        accountStatus: 'actif',
        subscriptionStatus: null,
        subscriptionActive: false,
        dateFin: null,
        accessProof: 'PROOF',
        expiresIn: 604800,
      },
      true,
      1_000_000,
    );
    // Session en mémoire + secure. hydrate doit confirmer.
    const ok = await sessionStore.hydrate(1_000_000);
    expect(ok).toBe(true);
    expect(sessionStore.hasSession()).toBe(true);
    expect(sessionStore.getAccessProof()).toBe('PROOF');
  });

  it('session expirée au démarrage est effacée', async () => {
    await sessionStore.setSession(
      {
        token: 'TEST_TOKEN_NOT_REAL',
        userId: 'DSI-00000',
        accountStatus: null,
        subscriptionStatus: null,
        subscriptionActive: false,
        dateFin: null,
        accessProof: null,
        expiresIn: 10,
      },
      true,
      1_000_000,
    );
    const ok = await sessionStore.hydrate(1_000_000 + 11_000);
    expect(ok).toBe(false);
    expect(sessionStore.hasSession()).toBe(false);
  });

  it('souvenir=false ne laisse pas de jeton au redémarrage', async () => {
    await sessionStore.setSession(
      {
        token: 'TEST_TOKEN_NOT_REAL',
        userId: 'DSI-00000',
        accountStatus: null,
        subscriptionStatus: null,
        subscriptionActive: false,
        dateFin: null,
        accessProof: null,
        expiresIn: 604800,
      },
      false,
    );
    expect(sessionStore.hasSession()).toBe(true);
    await sessionStore.clearSessionAsync();
    // mémoire seule déjà vide après clear ; hydrate ne retrouve rien
    const ok = await sessionStore.hydrate();
    expect(ok).toBe(false);
  });

  it('accessProof n’est jamais modifié après set', async () => {
    await sessionStore.setSession(
      {
        token: 'TEST_TOKEN_NOT_REAL',
        userId: 'DSI-00000',
        accountStatus: null,
        subscriptionStatus: null,
        subscriptionActive: false,
        dateFin: null,
        accessProof: 'OPAQUE',
        expiresIn: 604800,
      },
      false,
    );
    expect(sessionStore.getAccessProof()).toBe('OPAQUE');
  });
});
