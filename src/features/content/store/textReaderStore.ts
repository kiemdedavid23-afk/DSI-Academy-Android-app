/**
 * Lecteur de texte : ouverture via le moteur (L4b), blocs d'affichage,
 * progression locale (enregistrée à retardement), taille du texte mémorisée.
 * Rien du contenu n'est enregistré : seuls l'id, le pourcentage et le titre
 * de reprise le sont.
 */

import {readTextContent} from '@core/media/textReader';
import {loadTrace} from '@core/media/loadTrace';
import type {MediaErrorKind} from '@core/utils/readerFailure';
import {storageGet, storageSet} from '@core/storage';
import {continueStore, progressStore, storeRegistry} from '@shared/store';
import {chunkText} from '../logic/chunkText';
import {createSimpleStore} from './simpleStore';

const PREFS_KEY = 'dsi_reader_prefs';
export const SAVE_DELAY_MS = 1000;
/** Sous ce seuil on repart du début sans le dire ; au-delà, lecture terminée. */
export const RESUME_MIN = 3;
export const RESUME_MAX = 97;
export const FONT_SCALES = [0.85, 1, 1.15, 1.3, 1.5] as const;
const DEFAULT_SCALE_INDEX = 1;

export type TextReaderState = {
  contentId: number | null;
  title: string;
  status: 'idle' | 'loading' | 'ready' | 'unsupported' | 'error';
  /** Format du livre quand ce n'est pas du texte brut. */
  format: string | null;
  chunks: string[];
  errorKind: MediaErrorKind | null;
  retryable: boolean;
  /** Pourcentage à reprendre, ou null (début). */
  resumePercent: number | null;
  scaleIndex: number;
};

const INITIAL: TextReaderState = {
  contentId: null,
  title: '',
  status: 'idle',
  format: null,
  chunks: [],
  errorKind: null,
  retryable: false,
  resumePercent: null,
  scaleIndex: DEFAULT_SCALE_INDEX,
};

export function createTextReaderStore() {
  const store = createSimpleStore<TextReaderState>(INITIAL);
  let generation = 0;
  let abort: AbortController | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: number | null = null;

  async function persist(): Promise<void> {
    const {contentId, title} = store.getState();
    if (contentId === null || pending === null) {
      return;
    }
    const percent = pending;
    pending = null;
    await progressStore.save(contentId, percent);
    await continueStore.set({
      id: String(contentId),
      house: 'library',
      title,
      path: '',
      progress: percent,
    });
  }

  async function open(contentId: number, title: string): Promise<void> {
    generation += 1;
    const mine = generation;
    abort?.abort();
    abort = new AbortController();
    const scale = await storageGet<number>(PREFS_KEY, DEFAULT_SCALE_INDEX);
    const scaleIndex =
      Number.isInteger(scale) && scale >= 0 && scale < FONT_SCALES.length
        ? scale
        : DEFAULT_SCALE_INDEX;
    store.replace({
      ...INITIAL,
      contentId,
      title,
      status: 'loading',
      scaleIndex,
    });
    loadTrace.begin('text');
    const [res, saved] = await Promise.all([
      readTextContent(contentId, {signal: abort.signal}),
      progressStore.get(contentId),
    ]);
    if (mine !== generation) {
      return;
    }
    if (res.kind !== 'notText') {
      loadTrace.finish(res.kind === 'failure');
    }
    if (res.kind === 'failure') {
      store.setState({
        status: 'error',
        errorKind: res.errorKind,
        retryable: res.retryable,
      });
      return;
    }
    if (res.kind === 'notText') {
      store.setState({status: 'unsupported', format: res.format});
      return;
    }
    const chunks = chunkText(res.text);
    store.setState({
      status: 'ready',
      chunks,
      resumePercent:
        saved !== null && saved > RESUME_MIN && saved < RESUME_MAX
          ? Math.round(saved)
          : null,
    });
  }

  const api = {
    getState: store.getState,
    subscribe: store.subscribe,
    open,
    /** Appelé à chaque défilement : enregistre une seconde après le dernier. */
    reportProgress: (percent: number) => {
      if (store.getState().status !== 'ready' || !Number.isFinite(percent)) {
        return;
      }
      pending = Math.max(0, Math.min(100, percent));
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => void persist(), SAVE_DELAY_MS);
    },
    dismissResume: () => store.setState({resumePercent: null}),
    setScaleIndex: (i: number) => {
      if (i < 0 || i >= FONT_SCALES.length) {
        return;
      }
      store.setState({scaleIndex: i});
      void storageSet(PREFS_KEY, i);
    },
    /** Quitter le lecteur : enregistre tout de suite, annule la lecture en cours. */
    close: async () => {
      generation += 1;
      abort?.abort();
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      await persist();
      store.replace(INITIAL);
    },
    reset: () => {
      generation += 1;
      abort?.abort();
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      pending = null;
      store.replace(INITIAL);
    },
    purge: () => api.reset(),
  };
  storeRegistry.register(api);
  return api;
}

export const textReaderStore = createTextReaderStore();
