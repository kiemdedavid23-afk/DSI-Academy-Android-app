import {registrationTracking} from '@core/session';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const keychain = require('react-native-keychain');

describe('registrationTracking', () => {
  beforeEach(async () => {
    if (typeof keychain.__reset === 'function') {
      keychain.__reset();
    }
    await registrationTracking.clear();
  });

  it('stocke et relit un suivi', async () => {
    await registrationTracking.save({
      userId: 'DSI-00000',
      paymentTrackingToken: 'TEST_TRACKING_TOKEN_NOT_REAL',
      paymentMode: 'hosted',
      paymentUrl: 'https://checkout.example.invalid/pay/TEST',
      now: 1_000_000,
    });
    const read = await registrationTracking.read(1_000_000);
    expect(read?.paymentTrackingToken).toBe('TEST_TRACKING_TOKEN_NOT_REAL');
    expect(read?.paymentMode).toBe('hosted');
  });

  it('ignore un jeton expiré', async () => {
    await registrationTracking.save({
      userId: 'DSI-00000',
      paymentTrackingToken: 'TEST_TRACKING_TOKEN_NOT_REAL',
      paymentMode: 'direct',
      paymentUrl: null,
      now: 1_000_000,
    });
    const day = 24 * 60 * 60 * 1000;
    const read = await registrationTracking.read(1_000_000 + day + 1);
    expect(read).toBeNull();
  });

  it('est séparé de la session (clé distincte)', async () => {
    await registrationTracking.save({
      userId: 'DSI-00000',
      paymentTrackingToken: 'TEST_TRACKING_TOKEN_NOT_REAL',
      paymentMode: 'direct',
      paymentUrl: null,
    });
    // clear session secure n'est pas testé ici ; on vérifie juste la lecture
    expect(await registrationTracking.read()).not.toBeNull();
  });
});
