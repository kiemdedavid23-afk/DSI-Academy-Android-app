import {NativeModules} from 'react-native';
import {classifyPdfError} from './pdfNative';

/** Pont vers le module Kotlin DsiDoc : EPUB, MOBI, DOCX lus en mémoire et analysés en natif. */

export type DocBlock = {k: 'h' | 'p'; l: number; x: string};
export const DOC_FORMATS = ['epub', 'mobi', 'docx'] as const;
export const MAX_DOC_BYTES = 60 * 1024 * 1024;

export type DocErrorKind =
  | ReturnType<typeof classifyPdfError>['errorKind']
  | 'docInvalid'
  | 'docEncrypted'
  | 'docUnsupportedMobi';

export type DocOpenResult =
  | {kind: 'success'; blocks: DocBlock[]}
  | {kind: 'failure'; errorKind: DocErrorKind; code: string; retryable: boolean; reResolve: boolean};

type NativeDsiDoc = {
  open(requestId: string, url: string, format: string, maxBytes: number): Promise<string>;
  cancelOpen(requestId: string): void;
};

function native(): NativeDsiDoc | null {
  return (NativeModules as {DsiDoc?: NativeDsiDoc}).DsiDoc ?? null;
}

export function isDocFormat(format: string | null | undefined): boolean {
  return !!format && (DOC_FORMATS as readonly string[]).includes(format.toLowerCase());
}

export function classifyDocError(code: string) {
  switch (code) {
    case 'DOC_INVALID':
    case 'DOC_EMPTY':
      return {errorKind: 'docInvalid' as const, retryable: false, reResolve: false};
    case 'DOC_ENCRYPTED':
      return {errorKind: 'docEncrypted' as const, retryable: false, reResolve: false};
    case 'DOC_UNSUPPORTED_MOBI':
      return {errorKind: 'docUnsupportedMobi' as const, retryable: false, reResolve: false};
    case 'UNSUPPORTED_FORMAT':
      return {errorKind: 'unsupportedFormat' as const, retryable: false, reResolve: false};
    default:
      return classifyPdfError(code);
  }
}

export async function openDocument(url: string, format: string, requestId: string): Promise<DocOpenResult> {
  const mod = native();
  if (!mod) {
    return {kind: 'failure', errorKind: 'unsupportedFormat', code: 'NO_NATIVE_MODULE', retryable: false, reResolve: false};
  }
  try {
    const json = await mod.open(requestId, url, format.toLowerCase(), MAX_DOC_BYTES);
    return {kind: 'success', blocks: JSON.parse(json) as DocBlock[]};
  } catch (e) {
    const code = (e as {code?: string}).code ?? 'NETWORK';
    return {kind: 'failure', code, ...classifyDocError(code)};
  }
}

export function cancelOpenDocument(requestId: string): void {
  native()?.cancelOpen(requestId);
}
