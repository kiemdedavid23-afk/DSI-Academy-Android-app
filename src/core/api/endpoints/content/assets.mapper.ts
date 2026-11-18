import {
  asBool,
  asDateIso,
  asInt,
  asNumber,
  asRecord,
  asString,
  checkResponse,
  failure,
} from './common.mapper';
import type {Asset, AssetResult, AssetsResult} from './assets.types';

export function mapAsset(raw: unknown): Asset | null {
  const r = asRecord(raw);
  if (!r) {
    return null;
  }
  const id = asInt(r.id);
  const contentId = asInt(r.content_id);
  const format = asString(r.format);
  if (id === null || contentId === null || format === null) {
    return null;
  }
  return {
    id,
    contentId,
    format,
    mimeType: asString(r.mime_type),
    sizeBytes: asNumber(r.size_bytes),
    durationSeconds: asNumber(r.duration_seconds),
    quality: asString(r.quality),
    language: asString(r.language),
    downloadable: asBool(r.downloadable),
    status: asString(r.status) ?? 'active',
    priority: asNumber(r.priority) ?? 0,
    createdAt: asDateIso(r.created_at),
    updatedAt: asDateIso(r.updated_at),
  };
}

/** GET /content/:id/assets → { items }. Contenu inexistant : liste vide (pas de 404). */
export function mapAssets(
  status: number,
  body: unknown,
  bodyKind?: string,
): AssetsResult {
  const bad = checkResponse(status, body, bodyKind);
  if (bad) {
    return bad;
  }
  const r = asRecord(body);
  if (!r || !Array.isArray(r.items)) {
    return failure('invalidResponse', status, 'MISSING_ITEMS');
  }
  const items: Asset[] = [];
  r.items.forEach(entry => {
    const asset = mapAsset(entry);
    if (asset) {
      items.push(asset);
    }
  });
  return {kind: 'success', items};
}

/** GET /content/:id/assets/best et GET /assets/:id → un asset. */
export function mapSingleAsset(
  status: number,
  body: unknown,
  bodyKind?: string,
): AssetResult {
  const bad = checkResponse(status, body, bodyKind);
  if (bad) {
    return bad;
  }
  const asset = mapAsset(body);
  return asset
    ? {kind: 'success', item: asset}
    : failure('invalidResponse', status, 'INVALID_ASSET');
}
