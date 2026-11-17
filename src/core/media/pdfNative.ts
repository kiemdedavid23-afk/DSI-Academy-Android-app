import {NativeModules} from 'react-native';
import {pollProgress} from './progressPoll';
import type {MediaErrorKind} from './types';

/** Pont vers le module Kotlin DsiPdf (PdfRenderer). Aucun texte de la source n'est exposé. */

type NativeDsiPdf = {
  open(requestId: string, url: string, maxBytes: number): Promise<{handle: string; pageCount: number}>;
  cancelOpen(requestId: string): void;
  getProgress?(requestId: string): Promise<{loaded: number; total: number}>;
  renderPage(handle: string, index: number, width: number): Promise<{uri: string; width: number; height: number}>;
  close(handle: string): Promise<void>;
};

export const MAX_PDF_BYTES = 200 * 1024 * 1024;

export type PdfOpenResult =
  | {kind: 'success'; handle: string; pageCount: number}
  | {kind: 'failure'; errorKind: MediaErrorKind | 'pdfProtected' | 'pdfInvalid'; code: string; retryable: boolean; reResolve: boolean};

function native(): NativeDsiPdf | null {
  return (NativeModules as {DsiPdf?: NativeDsiPdf}).DsiPdf ?? null;
}

export function isPdfNativeAvailable(): boolean {
  return native() !== null;
}

export function classifyPdfError(code: string): Omit<Extract<PdfOpenResult, {kind: 'failure'}>, 'kind' | 'code'> {
  if (code === 'HTTP_401' || code === 'HTTP_403') {
    return {errorKind: 'sourceRejected', retryable: false, reResolve: true};
  }
  if (code === 'HTTP_404' || code === 'HTTP_410') {
    return {errorKind: 'notFound', retryable: false, reResolve: true};
  }
  if (code === 'SOURCE_HTML_PAGE') {
    return {errorKind: 'sourceHtmlPage', retryable: false, reResolve: true};
  }
  if (code === 'HTTP_429') {
    return {errorKind: 'sourceRateLimited', retryable: true, reResolve: false};
  }
  if (code.startsWith('HTTP_')) {
    return {errorKind: 'sourceServer', retryable: true, reResolve: false};
  }
  switch (code) {
    case 'TOO_LARGE':
      return {errorKind: 'tooLarge', retryable: false, reResolve: false};
    case 'PDF_PROTECTED':
      return {errorKind: 'pdfProtected', retryable: false, reResolve: false};
    case 'PDF_INVALID':
      return {errorKind: 'pdfInvalid', retryable: false, reResolve: false};
    case 'ABORTED':
      return {errorKind: 'aborted', retryable: false, reResolve: false};
    default:
      return {errorKind: 'network', retryable: true, reResolve: false};
  }
}

export async function openPdf(url: string, requestId: string): Promise<PdfOpenResult> {
  const mod = native();
  if (!mod) {
    return {kind: 'failure', errorKind: 'unsupportedFormat', code: 'NO_NATIVE_MODULE', retryable: false, reResolve: false};
  }
  const stop = pollProgress(requestId, mod.getProgress ? id => mod.getProgress!(id) : undefined);
  try {
    const res = await mod.open(requestId, url, MAX_PDF_BYTES);
    return {kind: 'success', handle: res.handle, pageCount: res.pageCount};
  } catch (e) {
    const code = (e as {code?: string}).code ?? 'NETWORK';
    return {kind: 'failure', code, ...classifyPdfError(code)};
  } finally {
    stop();
  }
}

export function cancelOpenPdf(requestId: string): void {
  native()?.cancelOpen(requestId);
}

export async function renderPdfPage(handle: string, index: number, width: number) {
  const mod = native();
  if (!mod) {
    throw new Error('NO_NATIVE_MODULE');
  }
  return mod.renderPage(handle, index, width);
}

export async function closePdf(handle: string): Promise<void> {
  try {
    await native()?.close(handle);
  } catch {
    /* fermeture au mieux : le cache est aussi purgé au démarrage */
  }
}
