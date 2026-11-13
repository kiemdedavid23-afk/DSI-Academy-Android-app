/**
 * Stockage clé/valeur non sensible (préférences, caches locaux non secrets).
 * Le jeton d'authentification n'y passe jamais (étape 1 / stockage sécurisé).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export async function storageGet<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) {
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function storageSet(key: string, value: unknown): Promise<boolean> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export async function storageRemove(key: string): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
