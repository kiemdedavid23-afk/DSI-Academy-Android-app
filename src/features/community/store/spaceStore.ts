/**
 * Détail d'un espace (C5) : une entrée par espace, purgée à la déconnexion.
 * `private` : espace privé non rejoint (ACCESS_DENIED) ; `notFound` : NOT_FOUND.
 */

import {createStore} from 'zustand/vanilla';
import {fetchSpace} from '@core/api/endpoints/community/spaces.api';
import type {SpaceDetail} from '@core/api/endpoints/community/spaces.types';
import {storeRegistry} from '@shared/store';
import {failureKey} from './communityErrorKeys';

export type SpaceEntry = {
  status: 'loading' | 'ready' | 'notFound' | 'private' | 'error';
  space: SpaceDetail | null;
  errorKey: string | null;
};

type State = {spaces: Record<string, SpaceEntry>};

const store = createStore<State>(() => ({spaces: {}}));
const generation: Record<string, number> = {};

function put(id: string, entry: SpaceEntry): void {
  store.setState(s => ({spaces: {...s.spaces, [id]: entry}}));
}

export const spaceStore = {
  getState: () => store.getState(),
  subscribe: (listener: () => void) => store.subscribe(listener),

  /** Ouverture : affiche le chargement, sauf si l'espace est déjà là (relecture silencieuse). */
  async open(id: string): Promise<void> {
    const current = store.getState().spaces[id];
    if (!current || current.status !== 'ready') {
      put(id, {status: 'loading', space: null, errorKey: null});
    }
    await spaceStore.reload(id);
  },

  async reload(id: string): Promise<void> {
    const mine = (generation[id] = (generation[id] ?? 0) + 1);
    const res = await fetchSpace(id);
    if (mine !== generation[id]) {
      return;
    }
    if (res.kind === 'success') {
      put(id, {status: 'ready', space: res.space, errorKey: null});
      return;
    }
    if (res.code === 'NOT_FOUND') {
      put(id, {status: 'notFound', space: null, errorKey: null});
      return;
    }
    if (res.code === 'ACCESS_DENIED') {
      put(id, {status: 'private', space: null, errorKey: null});
      return;
    }
    const previous = store.getState().spaces[id];
    if (previous?.status === 'ready') {
      return; // une relecture ratée ne masque pas l'espace déjà affiché
    }
    put(id, {status: 'error', space: null, errorKey: failureKey(res)});
  },

  reset(): void {
    Object.keys(generation).forEach(k => {
      generation[k] += 1;
    });
    store.setState({spaces: {}});
  },
  purge(): void {
    spaceStore.reset();
  },
};

storeRegistry.register(spaceStore);
