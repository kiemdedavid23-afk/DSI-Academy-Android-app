import type {EnvelopeResult} from '@core/network';
import {failure, failureFromEnvelope, isRecord} from './common.mapper';
import type {CommunityResult} from './common.types';
import {
  PREFS_KEYS,
  PRIVACY_KEYS,
  type CommunitySettings,
} from './settings.types';

/** Objets vides tant que rien n'est enregistré : une clé absente vaut « activé ». */
function readBooleans<K extends string>(raw: unknown, keys: readonly K[]): Record<K, boolean> {
  const source = isRecord(raw) ? raw : {};
  const out = {} as Record<K, boolean>;
  keys.forEach(k => {
    out[k] = typeof source[k] === 'boolean' ? (source[k] as boolean) : true;
  });
  return out;
}

export function mapSettings(env: EnvelopeResult): CommunityResult<{settings: CommunitySettings}> {
  if (!env.success) {
    return failureFromEnvelope(env);
  }
  if (!isRecord(env.data)) {
    return failure('invalidResponse', env.status, 'INVALID_RESPONSE');
  }
  return {
    kind: 'success',
    settings: {
      privacy: readBooleans(env.data.privacy, PRIVACY_KEYS),
      prefs: readBooleans(env.data.prefs, PREFS_KEYS),
    },
  };
}
