/* eslint-disable prettier/prettier */
import {buildStrategy, planStrategy, MAX_TEXT_BYTES} from '@core/media/strategy';
import {buildRangeHeader, planResume} from '@core/media/range';
import {
  fromDeliveryFailure,
  fromProbeFailure,
} from '@core/media/errors';
import {parseContentRangeTotal} from '@core/network/sourceProbe';
import {parseYoutubeVideoId} from '@core/config/urlGuards';
import type {DeliveryLink} from '@core/api/endpoints/content/delivery.types';

const link = (over: Partial<DeliveryLink>): DeliveryLink => ({
  contentId: 1,
  contentType: 'book',
  assetId: 2,
  providerId: 'google_drive',
  format: 'pdf',
  url: 'https://files.example.invalid/f',
  mimeType: null,
  sizeBytes: null,
  ...over,
});
const ok = (over = {}) => ({
  kind: 'ok' as const,
  status: 206,
  contentType: 'application/pdf',
  totalBytes: 1000,
  rangeSupported: true,
  ...over,
});

describe('planStrategy', () => {
  it('livres : pdf/epub/mobi/docx → fichier temporaire, txt → texte borné', () => {
    ['pdf', 'epub', 'mobi', 'docx', 'PDF'].forEach(format => {
      expect(planStrategy(link({format}))).toEqual({kind: 'tempFile'});
    });
    expect(planStrategy(link({format: 'txt'}))).toEqual({kind: 'boundedText'});
    expect(planStrategy(link({format: 'cbz'}))).toEqual({refusal: 'UNSUPPORTED_FORMAT'});
  });
  it('audio et vidéo fichier → lecture native ; autre format refusé', () => {
    ['mp3', 'wav', 'm4a'].forEach(format => {
      expect(planStrategy(link({contentType: 'audio', format}))).toEqual({kind: 'nativeStream'});
    });
    ['mp4', 'webm'].forEach(format => {
      expect(planStrategy(link({contentType: 'video', format}))).toEqual({kind: 'nativeStream'});
    });
    expect(planStrategy(link({contentType: 'audio', format: 'pdf'}))).toEqual({refusal: 'UNSUPPORTED_FORMAT'});
  });
  it('YouTube : seulement avec le provider youtube', () => {
    expect(planStrategy(link({contentType: 'video', format: 'youtube_url', providerId: 'youtube'}))).toEqual({kind: 'embeddedYoutube'});
    expect(planStrategy(link({contentType: 'video', format: 'youtube_url', providerId: 'catbox'}))).toEqual({refusal: 'FORMAT_MISMATCH'});
  });
  it('telegram, mega et formation refusés', () => {
    expect(planStrategy(link({providerId: 'telegram'}))).toEqual({refusal: 'UNSUPPORTED_PROVIDER'});
    expect(planStrategy(link({providerId: 'mega'}))).toEqual({refusal: 'UNSUPPORTED_PROVIDER'});
    expect(planStrategy(link({contentType: 'training'}))).toEqual({refusal: 'TRAINING_HAS_NO_ASSET'});
  });
});

describe('buildStrategy', () => {
  it('nativeStream : mime de la source si audio/vidéo, sinon celui du lien', () => {
    const audio = link({contentType: 'audio', format: 'mp3', mimeType: 'audio/mpeg'});
    const s1 = buildStrategy(audio, 'nativeStream', ok({contentType: 'audio/mpeg'}));
    expect(s1).toMatchObject({kind: 'nativeStream', mimeType: 'audio/mpeg', totalBytes: 1000, rangeSupported: true});
    const s2 = buildStrategy(audio, 'nativeStream', ok({contentType: 'application/octet-stream'}));
    expect(s2).toMatchObject({mimeType: 'audio/mpeg'});
  });
  it('taille : sondage d’abord, sinon taille du lien', () => {
    const s = buildStrategy(link({sizeBytes: 500}), 'tempFile', ok({totalBytes: null}));
    expect(s).toMatchObject({kind: 'tempFile', totalBytes: 500});
  });
  it('texte borné : plafond appliqué', () => {
    expect(buildStrategy(link({format: 'txt'}), 'boundedText', ok())).toMatchObject({kind: 'boundedText', maxBytes: MAX_TEXT_BYTES});
  });
  it('YouTube : identifiant extrait, lien étranger refusé', () => {
    const yt = link({contentType: 'video', format: 'youtube_url', providerId: 'youtube', url: 'https://www.youtube.com/watch?v=abcdefghijk'});
    expect(buildStrategy(yt, 'embeddedYoutube', null)).toEqual({kind: 'embeddedYoutube', videoId: 'abcdefghijk'});
    expect(buildStrategy({...yt, url: 'https://evil.example.invalid/watch?v=abcdefghijk'}, 'embeddedYoutube', null)).toEqual({refusal: 'INVALID_YOUTUBE_LINK'});
  });
});

describe('parseYoutubeVideoId', () => {
  it('formes acceptées et refusées', () => {
    expect(parseYoutubeVideoId('https://www.youtube.com/watch?v=abcdefghijk')).toBe('abcdefghijk');
    expect(parseYoutubeVideoId('https://m.youtube.com/watch?x=1&v=abcdefghijk&t=2')).toBe('abcdefghijk');
    expect(parseYoutubeVideoId('https://youtu.be/abcdefghijk?t=3')).toBe('abcdefghijk');
    expect(parseYoutubeVideoId('http://www.youtube.com/watch?v=abcdefghijk')).toBeNull();
    expect(parseYoutubeVideoId('https://youtube.com.evil.invalid/watch?v=abcdefghijk')).toBeNull();
    expect(parseYoutubeVideoId('https://www.youtube.com/watch?v=court')).toBeNull();
    expect(parseYoutubeVideoId(null)).toBeNull();
  });
});

describe('range', () => {
  it('en-tête Range', () => {
    expect(buildRangeHeader(100)).toBe('bytes=100-');
    expect(buildRangeHeader(0, 0)).toBe('bytes=0-0');
    expect(buildRangeHeader(-5)).toBe('bytes=0-');
  });
  it('plan de reprise', () => {
    expect(planResume({downloadedBytes: 0, totalBytes: 100, rangeSupported: true})).toEqual({action: 'restart'});
    expect(planResume({downloadedBytes: 40, totalBytes: 100, rangeSupported: true})).toEqual({action: 'resume', startByte: 40});
    expect(planResume({downloadedBytes: 40, totalBytes: 100, rangeSupported: false})).toEqual({action: 'restart'});
    expect(planResume({downloadedBytes: 100, totalBytes: 100, rangeSupported: true})).toEqual({action: 'complete'});
    expect(planResume({downloadedBytes: 120, totalBytes: 100, rangeSupported: true})).toEqual({action: 'restart'});
    expect(planResume({downloadedBytes: 40, totalBytes: null, rangeSupported: true})).toEqual({action: 'resume', startByte: 40});
  });
  it('Content-Range', () => {
    expect(parseContentRangeTotal('bytes 0-0/12345')).toBe(12345);
    expect(parseContentRangeTotal('bytes 0-0/*')).toBeNull();
    expect(parseContentRangeTotal(null)).toBeNull();
    expect(parseContentRangeTotal('n’importe quoi')).toBeNull();
  });
});

describe('errors', () => {
  const f = (errorKind: any, code: string | null) => ({kind: 'failure' as const, errorKind, status: null, code});
  it('échecs du Worker', () => {
    expect(fromDeliveryFailure(f('unauthorized', 'ACCESS_PROOF_EXPIRED'))).toMatchObject({errorKind: 'accessDenied', retryable: false});
    expect(fromDeliveryFailure(f('noProof', 'ACCESS_PROOF_MISSING'))).toMatchObject({errorKind: 'accessDenied'});
    expect(fromDeliveryFailure(f('forbidden', 'ACCESS_SUBSCRIPTION_INACTIVE'))).toMatchObject({errorKind: 'subscriptionInactive'});
    expect(fromDeliveryFailure(f('forbidden', 'CONTENT_NOT_AVAILABLE'))).toMatchObject({errorKind: 'notAvailable'});
    expect(fromDeliveryFailure(f('notFound', 'NO_COMPATIBLE_ASSET'))).toMatchObject({errorKind: 'noAsset'});
    expect(fromDeliveryFailure(f('providerLink', 'LINK_UNAVAILABLE_FOR_PROVIDER'))).toMatchObject({errorKind: 'sourceUnavailable', retryable: true});
    expect(fromDeliveryFailure(f('unsupportedMode', 'PROXY_TOKEN_RESPONSE'))).toMatchObject({errorKind: 'workerNotMigrated', retryable: false});
    expect(fromDeliveryFailure(f('network', null))).toMatchObject({errorKind: 'network', retryable: true});
    expect(fromDeliveryFailure(f('server', 'INTERNAL_ERROR'))).toMatchObject({errorKind: 'server', retryable: true});
  });
  it('échecs de la source', () => {
    expect(fromProbeFailure('rejected', 403)).toMatchObject({errorKind: 'sourceRejected', code: 'SOURCE_HTTP_403', retryable: false});
    expect(fromProbeFailure('htmlPage', 200)).toMatchObject({errorKind: 'sourceHtmlPage', code: 'SOURCE_HTML_PAGE'});
    expect(fromProbeFailure('rateLimited', 429)).toMatchObject({retryable: true});
    expect(fromProbeFailure('timeout', null)).toMatchObject({errorKind: 'timeout', code: null, retryable: true});
    expect(fromProbeFailure('aborted', null)).toMatchObject({retryable: false});
  });
});
