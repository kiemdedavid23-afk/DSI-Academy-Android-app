/**
 * Liste des espaces publics (C5), avec recherche. Un chargement plus récent
 * remplace un plus ancien (la recherche change vite). Purgé à la déconnexion
 * (R-SEC-4).
 */

import {createStore} from 'zustand/vanilla';
import {listSpaces} from '@core/api/endpoints/community/spaces.api';
import type {SpaceSummary} from '@core/api/endpoints/community/spaces.types';
import {storeRegistry} from '@shared/store';
import {failureKey} from './communityErrorKeys';

export type SpacesState = {
  data: SpaceSummary[] | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  /** Clé de traduction, jamais le texte du serveur. */
  error: string | null;
  updatedAt: number | null;
  /** Recherche appliquée au dernier chargement. */
  query: string;
};

const INITIAL: SpacesState = {
  data: null,
  status: 'idle',
  error: null,
  updatedAt: null,
  query: '',
};

const store = createStore<SpacesState>(() => INITIAL);
let sequence = 0;

export function cleanSpaceQuery(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

export const spacesStore = {
  getState: () => store.getState(),
  subscribe: (listener: () => void) => store.subscribe(listener),

  async load(rawQuery = ''): Promise<void> {
    const query = cleanSpaceQuery(rawQuery);
    const mine = ++sequence;
    store.setState({status: 'loading', error: null, query});
    const res = await listSpaces(query || undefined);
    if (mine !== sequence) {
      return; // une recherche plus récente a pris le relais, ou la session a été purgée
    }
    if (res.kind !== 'success') {
      // On garde la liste déjà affichée : seule l'erreur s'ajoute.
      store.setState({status: 'error', error: failureKey(res)});
      return;
    }
    store.setState({
      data: res.items,
      status: 'success',
      error: null,
      updatedAt: Date.now(),
    });
  },

  /** Relit avec la recherche en cours (après rejoindre, quitter, créer). */
  reload(): Promise<void> {
    return spacesStore.load(store.getState().query);
  },

  reset(): void {
    sequence += 1;
    store.setState(INITIAL);
  },
  purge(): void {
    spacesStore.reset();
  },
};

storeRegistry.register(spacesStore);
