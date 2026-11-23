import {safeEnvelope} from '@core/network';
import {community, noProof} from './common.api';
import {mapSettings} from './settings.mapper';
import {PREFS_KEYS, PRIVACY_KEYS, type CommunitySettings} from './settings.types';

const AUTH = {auth: 'accessProof'} as const;
const path = '/api/community/settings';

export async function fetchSettings() {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  return mapSettings(await safeEnvelope(community().get(path, AUTH)));
}

/**
 * Le PUT REMPLACE tout : une clé absente est perdue. On envoie donc toujours
 * les six clés, rien d'autre (rapport §11.9). Écriture jamais rejouée.
 */
export async function saveSettings(settings: CommunitySettings) {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  const privacy: Record<string, boolean> = {};
  PRIVACY_KEYS.forEach(k => {
    privacy[k] = settings.privacy[k] === true;
  });
  const prefs: Record<string, boolean> = {};
  PREFS_KEYS.forEach(k => {
    prefs[k] = settings.prefs[k] === true;
  });
  return mapSettings(await safeEnvelope(community().put(path, {privacy, prefs}, AUTH)));
}
