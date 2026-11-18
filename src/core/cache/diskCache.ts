import AsyncStorage from '@react-native-async-storage/async-storage';
import {storageGet, storageSet} from '../storage/kvStorage';

/**
 * Cache local des réponses publiques du catalogue (listes, fiches, catégories,
 * composition des formations) : 24 h, en mémoire puis sur le disque de l'app.
 * Jamais utilisé pour les liens de lecture (/deliver), les preuves d'accès ni
 * les données du membre. Un échec réseau ou serveur renvoie la dernière copie
 * connue (jusqu'à 7 jours) plutôt qu'une erreur.
 */
// v2 : les réponses mises en cache sous v1 avaient un curseur et des dates
// mal lus (secondes Unix) ; elles sont abandonnées et effacées une fois.
const PREFIX = 'dsi.cache.v2:';
const LEGACY_PREFIXES = ['dsi.cache.v1:'];
export const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const STALE_MAX_MS = 7 * CACHE_TTL_MS;

type Entry<T> = {at: number; value: T};

const memory = new Map<string, Entry<unknown>>();
// Désactivé sous Jest pour ne pas fausser les tests d'API existants.
let enabled = process.env.NODE_ENV !== 'test';
let purged = false;

export function setCacheEnabled(value: boolean): void {
  enabled = value;
}

async function purgeExpiredOnce(): Promise<void> {
  if (purged) {
    return;
  }
  purged = true;
  try {
    const all = await AsyncStorage.getAllKeys();
    const legacy = all.filter(k => LEGACY_PREFIXES.some(p => k.startsWith(p)));
    if (legacy.length > 0) {
      await AsyncStorage.multiRemove(legacy);
    }
    const keys = all.filter(k => k.startsWith(PREFIX));
    const rows = await AsyncStorage.multiGet(keys);
    const old = rows
      .filter(([, raw]) => {
        try {
          const at = (JSON.parse(raw ?? 'null') as Entry<unknown> | null)?.at ?? 0;
          return Date.now() - at > STALE_MAX_MS;
        } catch {
          return true;
        }
      })
      .map(([k]) => k);
    if (old.length > 0) {
      await AsyncStorage.multiRemove(old);
    }
  } catch {
    // Nettoyage best effort : sans conséquence.
  }
}

export async function cached<T extends {kind: string}>(
  key: string,
  fetcher: () => Promise<T>,
): Promise<T> {
  if (!enabled) {
    return fetcher();
  }
  void purgeExpiredOnce();
  const now = Date.now();
  let entry = memory.get(key) as Entry<T> | undefined;
  if (!entry) {
    const disk = await storageGet<Entry<T> | null>(PREFIX + key, null);
    if (disk && typeof disk.at === 'number') {
      entry = disk;
      memory.set(key, disk);
    }
  }
  if (entry && now - entry.at < CACHE_TTL_MS) {
    return entry.value;
  }
  const result = await fetcher();
  if (result.kind !== 'failure') {
    const fresh: Entry<T> = {at: Date.now(), value: result};
    memory.set(key, fresh);
    void storageSet(PREFIX + key, fresh);
    return result;
  }
  const errorKind = (result as unknown as {errorKind?: string}).errorKind;
  if (entry && now - entry.at < STALE_MAX_MS && (errorKind === 'network' || errorKind === 'server')) {
    return entry.value;
  }
  return result;
}

/** Vide le cache (actualisation demandée par la personne). */
export async function clearContentCache(): Promise<void> {
  memory.clear();
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter(k => k.startsWith(PREFIX));
    if (keys.length > 0) {
      await AsyncStorage.multiRemove(keys);
    }
  } catch {
    // Best effort.
  }
}
