/**
 * Stockage sécurisé (Android Keystore via react-native-keychain).
 * Interface : secureGet / secureSet / secureRemove.
 * Pas d'options biométriques. Erreurs de lecture → null (R-SEC-1).
 * Aucun jeton dans un message d'erreur ou un log.
 *
 * API Keychain 11 : un service distinct par clé logique
 * (session vs jeton de suivi d'inscription).
 */

import * as Keychain from 'react-native-keychain';

const SERVICE_PREFIX = 'app.dsiacademy.secure';

function serviceFor(key: string): string {
  return `${SERVICE_PREFIX}.${key}`;
}

export async function secureGet(key: string): Promise<string | null> {
  try {
    const result = await Keychain.getGenericPassword({
      service: serviceFor(key),
    });
    if (result === false) {
      return null;
    }
    return result.password ?? null;
  } catch {
    return null;
  }
}

export async function secureSet(key: string, value: string): Promise<boolean> {
  try {
    await Keychain.setGenericPassword(key, value, {
      service: serviceFor(key),
    });
    return true;
  } catch {
    return false;
  }
}

export async function secureRemove(key: string): Promise<boolean> {
  try {
    await Keychain.resetGenericPassword({service: serviceFor(key)});
    return true;
  } catch {
    return false;
  }
}
