/**
 * Lecteur PDF natif : lien du moteur (L4b) → fichier temporaire privé écrit par
 * le module Kotlin → pages rendues à la demande. Effacé à la fermeture.
 * Seuls l'id, le pourcentage et le titre de reprise sont mémorisés.
 */

import {openMedia} from '@core/media/engine';
import {loadTrace} from '@core/media/loadTrace';
import {cancelOpenPdf, closePdf, openPdf} from '@core/media/pdfNative';
import {takeRecentMedia} from '@core/media/recentMedia';
import type {MediaErrorKind, OpenMediaResult} from '@core/media/types';
import {continueStore, progressStore, storeRegistry} from '@shared/store';
import {createSimpleStore} from './simpleStore';

export const PDF_SAVE_DELAY_MS = 1000;

export type PdfErrorKind = MediaErrorKind | 'pdfProtected' | 'pdfInvalid';

export type PdfReaderState = {
  contentId: number | null;
  title: string;
  status: 'idle' | 'loading' | 'ready' | 'error';
  handle: string | null;
  pageCount: number;
  startPage: number;
  errorKind: PdfErrorKind | null;
  retryable: boolean;
};

const INITIAL: PdfReaderState = {
  contentId: null,
  title: '',
  status: 'idle',
  handle: null,
  pageCount: 0,
  startPage: 0,
  errorKind: null,
  retryable: false,
};

export function pageToPercent(index: number, pageCount: number): number {
  if (pageCount <= 1) {
    return 100;
  }
  return Math.max(0, Math.min(100, (index / (pageCount - 1)) * 100));
}

export function percentToPage(percent: number | null, pageCount: number): number {
  if (percent === null || pageCount <= 1 || percent <= 3 || percent >= 97) {
    return 0;
  }
  return Math.max(0, Math.min(pageCount - 1, Math.round((percent / 100) * (pageCount - 1))));
}

export function createPdfReaderStore() {
  const store = createSimpleStore<PdfReaderState>(INITIAL);
  let generation = 0;
  let requestSeq = 0;
  let currentRequest: string | null = null;
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
    await continueStore.set({id: String(contentId), house: 'library', title, path: '', progress: percent});
  }

  function fail(kind: PdfErrorKind, retryable: boolean) {
    store.setState({status: 'error', errorKind: kind, retryable});
  }

  async function release(): Promise<void> {
    const {handle} = store.getState();
    if (currentRequest) {
      cancelOpenPdf(currentRequest);
      currentRequest = null;
    }
    if (handle) {
      await closePdf(handle);
    }
  }

  async function open(contentId: number, title: string): Promise<void> {
    generation += 1;
    const mine = generation;
    await release();
    store.replace({...INITIAL, contentId, title, status: 'loading'});
    const recent = takeRecentMedia(contentId);
    if (!recent) {
      loadTrace.begin('pdf');
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
        fail(opened.errorKind, opened.retryable);
        return;
      }
      const strategy = opened.media.strategy;
      if (strategy.kind !== 'tempFile' || strategy.format.toLowerCase() !== 'pdf') {
        fail('unsupportedFormat', false);
        return;
      }
      requestSeq += 1;
      currentRequest = `pdf-${requestSeq}`;
      const res = await openPdf(strategy.url, currentRequest);
      currentRequest = null;
      if (mine !== generation) {
        if (res.kind === 'success') {
          await closePdf(res.handle);
        }
        return;
      }
      if (res.kind === 'success') {
        loadTrace.step('render');
        store.setState({
          status: 'ready',
          handle: res.handle,
          pageCount: res.pageCount,
          startPage: percentToPage(saved, res.pageCount),
        });
        return;
      }
      if (res.reResolve && attempt === 0) {
        continue;
      }
      loadTrace.finish(true);
      fail(res.errorKind, res.retryable);
      return;
    }
  }

  const api = {
    getState: store.getState,
    subscribe: store.subscribe,
    open,
    reportPage: (index: number) => {
      const {status, pageCount} = store.getState();
      if (status !== 'ready') {
        return;
      }
      pending = pageToPercent(index, pageCount);
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => void persist(), PDF_SAVE_DELAY_MS);
    },
    close: async () => {
      generation += 1;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      await persist();
      await release();
      store.replace(INITIAL);
    },
    reset: () => {
      generation += 1;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      pending = null;
      void release();
      store.replace(INITIAL);
    },
    purge: () => api.reset(),
  };
  storeRegistry.register(api);
  return api;
}

export const pdfReaderStore = createPdfReaderStore();
