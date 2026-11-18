import {isHttpsUrl} from '../../../config/urlGuards';
import {
  asInt,
  asNumber,
  asRecord,
  asString,
  checkResponse,
  failure,
  isContentType,
} from './common.mapper';
import type {DeliveryResult} from './delivery.types';

// Réponses de l'ancien mode « relais » (site actuel) : le contrat du Worker
// ne les prévoit plus. Elles sont reconnues pour signaler un Worker non migré.
const PROXY_MODE_TYPES = ['video_playback_token', 'book_playback_token'];

/**
 * GET /content/:id/deliver (API.md, « Réponse 200 ») :
 * { status: 'OK', type: 'link', content_id, content_type, asset_id,
 *   provider_id, format, delivery: { status: 'OK', url, mime_type?, size_bytes? } }
 * Erreurs : le code reste celui du Worker (ACCESS_PROOF_*, CONTENT_NOT_AVAILABLE,
 * NO_COMPATIBLE_ASSET, LINK_UNAVAILABLE_FOR_PROVIDER...), sans texte inventé.
 */
export function mapDelivery(
  status: number,
  body: unknown,
  bodyKind?: string,
): DeliveryResult {
  // Flux binaire (Worker encore en mode relais) : le corps n'est pas du JSON.
  if (status >= 200 && status < 300 && bodyKind === 'invalid') {
    return failure('unsupportedMode', status, 'PROXY_STREAM_RESPONSE');
  }
  const bad = checkResponse(status, body, bodyKind);
  if (bad) {
    return bad;
  }
  const r = asRecord(body);
  const type = asString(r?.type);
  if (type !== null && PROXY_MODE_TYPES.includes(type)) {
    return failure('unsupportedMode', status, 'PROXY_TOKEN_RESPONSE');
  }
  const delivery = asRecord(r?.delivery);
  const contentId = asInt(r?.content_id);
  const assetId = asInt(r?.asset_id);
  const providerId = asString(r?.provider_id);
  const format = asString(r?.format);
  if (
    !r ||
    r.status !== 'OK' ||
    type !== 'link' ||
    !delivery ||
    delivery.status !== 'OK' ||
    contentId === null ||
    assetId === null ||
    providerId === null ||
    format === null ||
    !isContentType(r.content_type)
  ) {
    return failure('invalidResponse', status, 'INVALID_DELIVERY');
  }
  if (!isHttpsUrl(delivery.url)) {
    return failure('invalidResponse', status, 'INVALID_LINK');
  }
  return {
    kind: 'success',
    link: {
      contentId,
      contentType: r.content_type,
      assetId,
      providerId,
      format,
      url: delivery.url,
      mimeType: asString(delivery.mime_type),
      sizeBytes: asNumber(delivery.size_bytes),
      suggestedFilename: asString(r.suggested_filename),
    },
  };
}
