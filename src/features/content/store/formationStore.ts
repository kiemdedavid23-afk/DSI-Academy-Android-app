/**
 * Formation : programme (parties de l'œuvre, sinon arbre de composants) et progression par module.
 * La progression de chaque module vient des lecteurs (progressStore, par id de
 * module) ; la formation n'enregistre que son propre pourcentage pour « Reprendre ».
 */

import {fetchComponentTree} from '@core/api/endpoints/content/composition.api';
import {fetchPartsTree} from '@core/api/endpoints/content/parts.api';
import type {ContentErrorKind} from '@core/utils/contentDisplay';
import {continueStore, progressStore, storeRegistry} from '@shared/store';
import {flattenParts, flattenProgram, modulesOf, summarize, type ProgramItem} from '../logic/formationTree';
import {createSimpleStore} from './simpleStore';

export type FormationState = {
  id: number | null;
  title: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  items: ProgramItem[];
  progress: Record<number, number>;
  errorKind: ContentErrorKind | null;
};

const INITIAL: FormationState = {
  id: null,
  title: '',
  status: 'idle',
  items: [],
  progress: {},
  errorKind: null,
};

export function createFormationStore() {
  const store = createSimpleStore<FormationState>(INITIAL);
  let generation = 0;

  async function refreshProgress(): Promise<void> {
    const mine = generation;
    const {id, title, items} = store.getState();
    if (id === null) {
      return;
    }
    const modules = modulesOf(items);
    const values = await Promise.all(modules.map(m => progressStore.get(m.contentId)));
    if (mine !== generation) {
      return;
    }
    const progress: Record<number, number> = {};
    modules.forEach((m, i) => {
      progress[m.contentId] = values[i] ?? 0;
    });
    store.setState({progress});
    const sum = summarize(items, progress);
    if (sum.started) {
      await progressStore.save(id, sum.percent);
      await continueStore.set({id: String(id), house: 'formations', title, path: '', progress: sum.percent});
    }
  }

  async function load(id: number, title: string): Promise<void> {
    generation += 1;
    const mine = generation;
    store.replace({...INITIAL, id, title, status: 'loading'});
    // Worker v1.2 : le programme vient des parties de l'œuvre. Si le contenu
    // n'est pas une œuvre composée (ou Worker v1), repli sur les composants.
    const parts = await fetchPartsTree(id);
    if (mine !== generation) {
      return;
    }
    if (
      parts.kind === 'success' &&
      parts.overview.isWork &&
      parts.overview.items.length > 0
    ) {
      store.setState({status: 'success', items: flattenParts(parts.overview.items)});
      await refreshProgress();
      return;
    }
    const res = await fetchComponentTree(id);
    if (mine !== generation) {
      return;
    }
    if (res.kind === 'failure') {
      store.setState({status: 'error', errorKind: res.errorKind});
      return;
    }
    store.setState({status: 'success', items: flattenProgram(res.tree)});
    await refreshProgress();
  }

  const api = {
    getState: store.getState,
    subscribe: store.subscribe,
    load,
    refreshProgress,
    reset: () => {
      generation += 1;
      store.replace(INITIAL);
    },
    purge: () => api.reset(),
  };
  storeRegistry.register(api);
  return api;
}

export const formationStore = createFormationStore();
