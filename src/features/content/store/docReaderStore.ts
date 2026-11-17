/** Lecteur EPUB / MOBI / DOCX : lien du moteur → analyse native en mémoire. Rien n'est écrit sur le disque. */

import {openMedia} from '@core/media/engine';
import {loadTrace} from '@core/media/loadTrace';
import {takeRecentMedia} from '@core/media/recentMedia';
import type {OpenMediaResult} from '@core/media/types';
import {cancelOpenDocument, isDocFormat, openDocument, type DocBlock, type DocErrorKind} from '@core/media/docNative';
import {continueStore, progressStore, storeRegistry} from '@shared/store';
import {createSimpleStore} from './simpleStore';
import {percentToPage} from './pdfReaderStore';

export type DocReaderState = {
  contentId: number | null;
  title: string;
  status: 'idle' | 'loading' | 'ready' | 'error';
  blocks: DocBlock[];
  startIndex: number;
  errorKind: DocErrorKind | null;
  retryable: boolean;
};

const INITIAL: DocReaderState = {
  contentId: null, title: '', status: 'idle', blocks: [], startIndex: 0, errorKind: null, retryable: false,
};

export function createDocReaderStore() {
  const store = createSimpleStore<DocReaderState>(INITIAL);
  let generation = 0;
  let seq = 0;
  let request: string | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: number | null = null;

  async function persist() {
    const {contentId, title} = store.getState();
    if (contentId === null || pending === null) {
      return;
    }
    const percent = pending;
    pending = null;
    await progressStore.save(contentId, percent);
    await continueStore.set({id: String(contentId), house: 'library', title, path: '', progress: percent});
  }

  function stop() {
    if (request) {
      cancelOpenDocument(request);
      request = null;
    }
  }

  async function open(contentId: number, title: string) {
    generation += 1;
    const mine = generation;
    stop();
    store.replace({...INITIAL, contentId, title, status: 'loading'});
    const recent = takeRecentMedia(contentId);
    if (!recent) {
      loadTrace.begin('doc');
    }
    const saved = await progressStore.get(contentId);
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const opened: OpenMediaResult =
        attempt === 0 && recent ? {kind: 'success', media: recent} : await openMedia(contentId);
      if (mine !== generation) {
        return;
      }
      if (opened.kind === 'failure') {
        loadTrace.finish(true);
        store.setState({status: 'error', errorKind: opened.errorKind, retryable: opened.retryable});
        return;
      }
      const s = opened.media.strategy;
      if (s.kind !== 'tempFile' || !isDocFormat(s.format)) {
        store.setState({status: 'error', errorKind: 'unsupportedFormat', retryable: false});
        return;
      }
      seq += 1;
      request = `doc-${seq}`;
      const res = await openDocument(s.url, s.format, request);
      request = null;
      if (mine !== generation) {
        return;
      }
      if (res.kind === 'success') {
        loadTrace.finish();
        store.setState({
          status: 'ready',
          blocks: res.blocks,
          startIndex: percentToPage(saved, res.blocks.length),
        });
        return;
      }
      if (res.reResolve && attempt === 0) {
        continue;
      }
      loadTrace.finish(true);
      store.setState({status: 'error', errorKind: res.errorKind, retryable: res.retryable});
      return;
    }
  }

  const api = {
    getState: store.getState,
    subscribe: store.subscribe,
    open,
    reportIndex: (index: number) => {
      const {status, blocks} = store.getState();
      if (status !== 'ready' || blocks.length === 0) {
        return;
      }
      pending = blocks.length <= 1 ? 100 : Math.min(100, (index / (blocks.length - 1)) * 100);
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => void persist(), 1000);
    },
    close: async () => {
      generation += 1;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      await persist();
      stop();
      store.replace(INITIAL);
    },
    reset: () => {
      generation += 1;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      pending = null;
      stop();
      store.replace(INITIAL);
    },
    purge: () => api.reset(),
  };
  storeRegistry.register(api);
  return api;
}

export const docReaderStore = createDocReaderStore();
