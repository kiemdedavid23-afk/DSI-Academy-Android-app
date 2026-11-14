import {
  secureGet,
  secureSet,
  secureRemove,
} from '@core/storage/secureStorage';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const keychain = require('react-native-keychain');

describe('secureStorage', () => {
  beforeEach(() => {
    if (typeof keychain.__reset === 'function') {
      keychain.__reset();
    }
  });

  it('écrit et lit une valeur', async () => {
    await secureSet('k1', 'valeur');
    expect(await secureGet('k1')).toBe('valeur');
  });

  it('supprime une valeur', async () => {
    await secureSet('k2', 'x');
    await secureRemove('k2');
    expect(await secureGet('k2')).toBeNull();
  });

  it('retourne null si absent', async () => {
    expect(await secureGet('absent')).toBeNull();
  });

  it('utilise un service distinct par clé', async () => {
    await secureSet('session', 'a');
    await secureSet('tracking', 'b');
    expect(await secureGet('session')).toBe('a');
    expect(await secureGet('tracking')).toBe('b');
  });
});
