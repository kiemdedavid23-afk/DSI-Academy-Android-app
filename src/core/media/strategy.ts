import {parseYoutubeVideoId} from '../config/urlGuards';
import type {DeliveryLink} from '../api/endpoints/content/delivery.types';
import type {ProbeResult} from '../network/sourceProbe';
import type {PlaybackStrategy, StrategyRefusal} from './types';

/** Formats compatibles par type (docs du Worker : API.md, PROVIDERS.md). */
const BOOK_FILE_FORMATS = ['pdf', 'epub', 'mobi', 'docx'];
const BOOK_TEXT_FORMATS = ['txt'];
const AUDIO_FORMATS = ['mp3', 'wav', 'm4a'];
const VIDEO_FILE_FORMATS = ['mp4', 'webm'];
const VIDEO_YOUTUBE_FORMAT = 'youtube_url';

/** Providers que le Worker ne livre pas en lien (PROVIDERS.md). */
const UNSUPPORTED_PROVIDERS = ['telegram', 'mega'];

/**
 * Taille maximale d'un texte lu en mémoire. Valeur technique par défaut,
 * à confirmer au lot des lecteurs.
 */
export const MAX_TEXT_BYTES = 5 * 1024 * 1024;

export type StrategyKind = PlaybackStrategy['kind'];

/** Première étape : décide du type de lecture d'après le lien, sans réseau. */
export function planStrategy(
  link: DeliveryLink,
): {kind: StrategyKind} | {refusal: StrategyRefusal} {
  const format = link.format.toLowerCase();
  if (UNSUPPORTED_PROVIDERS.includes(link.providerId)) {
    return {refusal: 'UNSUPPORTED_PROVIDER'};
  }
  switch (link.contentType) {
    case 'training':
      return {refusal: 'TRAINING_HAS_NO_ASSET'};
    case 'book':
      if (BOOK_FILE_FORMATS.includes(format)) {
        return {kind: 'tempFile'};
      }
      if (BOOK_TEXT_FORMATS.includes(format)) {
        return {kind: 'boundedText'};
      }
      return {refusal: 'UNSUPPORTED_FORMAT'};
    case 'audio':
      return AUDIO_FORMATS.includes(format)
        ? {kind: 'nativeStream'}
        : {refusal: 'UNSUPPORTED_FORMAT'};
    case 'video':
      if (format === VIDEO_YOUTUBE_FORMAT) {
        return link.providerId === 'youtube'
          ? {kind: 'embeddedYoutube'}
          : {refusal: 'FORMAT_MISMATCH'};
      }
      return VIDEO_FILE_FORMATS.includes(format)
        ? {kind: 'nativeStream'}
        : {refusal: 'UNSUPPORTED_FORMAT'};
    default:
      return {refusal: 'UNSUPPORTED_FORMAT'};
  }
}

function pickMime(
  probe: Extract<ProbeResult, {kind: 'ok'}>,
  link: DeliveryLink,
): string | null {
  const fromSource = probe.contentType;
  if (
    fromSource &&
    (fromSource.startsWith('audio/') || fromSource.startsWith('video/'))
  ) {
    return fromSource;
  }
  return link.mimeType;
}

/**
 * Seconde étape : construit la stratégie finale. `probe` est null pour YouTube
 * (aucun sondage : la source est la page du lecteur intégré).
 */
export function buildStrategy(
  link: DeliveryLink,
  kind: StrategyKind,
  probe: Extract<ProbeResult, {kind: 'ok'}> | null,
): PlaybackStrategy | {refusal: StrategyRefusal} {
  if (kind === 'embeddedYoutube') {
    const videoId = parseYoutubeVideoId(link.url);
    return videoId ? {kind, videoId} : {refusal: 'INVALID_YOUTUBE_LINK'};
  }
  if (probe === null) {
    return {refusal: 'UNSUPPORTED_FORMAT'};
  }
  const totalBytes = probe.totalBytes ?? link.sizeBytes;
  if (kind === 'nativeStream') {
    return {
      kind,
      url: link.url,
      format: link.format.toLowerCase(),
      mimeType: pickMime(probe, link),
      totalBytes,
      rangeSupported: probe.rangeSupported,
    };
  }
  if (kind === 'tempFile') {
    return {
      kind,
      url: link.url,
      format: link.format.toLowerCase(),
      totalBytes,
      rangeSupported: probe.rangeSupported,
    };
  }
  return {
    kind: 'boundedText',
    url: link.url,
    maxBytes: MAX_TEXT_BYTES,
    totalBytes,
  };
}
