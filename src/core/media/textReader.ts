import {readBoundedText} from '../network/textSource';
import {fromProbeFailure, tooLarge} from './errors';
import {openMedia} from './engine';
import type {MediaFailure} from './types';

export type TextContentResult =
  | {kind: 'success'; contentId: number; text: string}
  /** Livre qui n'est pas du texte brut (pdf, epub…) : lu par un autre lecteur. */
  | {kind: 'notText'; contentId: number; format: string}
  | MediaFailure;

const RE_RESOLVE = ['rejected', 'notFound'];

/**
 * Ouvre un contenu via le moteur et, si c'est du texte brut, le lit en mémoire.
 * Lien refusé en cours de lecture : une seule nouvelle demande de lien.
 * Rien n'est enregistré durablement.
 */
export async function readTextContent(
  contentId: number,
  options: {signal?: AbortSignal} = {},
): Promise<TextContentResult> {
  let last: MediaFailure | null = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const opened = await openMedia(contentId, options);
    if (opened.kind === 'failure') {
      return opened;
    }
    const strategy = opened.media.strategy;
    if (strategy.kind !== 'boundedText') {
      return {
        kind: 'notText',
        contentId,
        format: opened.media.format,
      };
    }
    const read = await readBoundedText(strategy.url, {
      maxBytes: strategy.maxBytes,
      signal: options.signal,
    });
    if (read.kind === 'ok') {
      return {kind: 'success', contentId, text: read.text};
    }
    if (read.reason === 'tooLarge') {
      return tooLarge();
    }
    last = fromProbeFailure(read.reason, read.status);
    if (!RE_RESOLVE.includes(read.reason)) {
      return last;
    }
  }
  return last ?? fromProbeFailure('server', null);
}
