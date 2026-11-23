/** Réglages (C6) : lus à l'ouverture de l'écran, enregistrés par un bouton. */

import {fetchSettings, saveSettings} from '@core/api/endpoints/community/settings.api';
import type {CommunitySettings} from '@core/api/endpoints/community/settings.types';
import {createResourceStore, storeRegistry} from '@shared/store';
import {failureKey} from './communityErrorKeys';

const TTL_MS = 60_000;

async function loadSettings(): Promise<CommunitySettings> {
  const res = await fetchSettings();
  if (res.kind !== 'success') {
    throw new Error(failureKey(res));
  }
  return res.settings;
}

export const settingsStore = createResourceStore<CommunitySettings>({
  ttlMs: TTL_MS,
  fetcher: loadSettings,
});

storeRegistry.register(settingsStore);

export type SaveSettingsResult = {ok: true} | {ok: false; errorKey: string};

/** Envoie toujours les six clés. Jamais rejoué automatiquement. */
export async function saveSettingsAction(settings: CommunitySettings): Promise<SaveSettingsResult> {
  const res = await saveSettings(settings);
  if (res.kind !== 'success') {
    return {ok: false, errorKey: failureKey(res)};
  }
  settingsStore.api.setState({
    data: res.settings,
    status: 'success',
    error: null,
    updatedAt: Date.now(),
  });
  return {ok: true};
}
