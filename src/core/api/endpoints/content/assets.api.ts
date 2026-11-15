import {http} from '@core/network';
import {catchNet} from './common.api';
import {failure} from './common.mapper';
import {mapAssets, mapSingleAsset} from './assets.mapper';
import type {AssetResult, AssetsResult} from './assets.types';

function validId(id: number): boolean {
  return Number.isInteger(id) && id > 0;
}

/** GET /content/:content_id/assets?format=&status= */
export async function fetchAssets(
  contentId: number,
  filters: {format?: string; status?: string} = {},
): Promise<AssetsResult> {
  if (!validId(contentId)) {
    return failure('validation', null, 'INVALID_ID');
  }
  try {
    const response = await http
      .service('content')
      .get(`/content/${contentId}/assets`, {
        auth: 'none',
        query: {format: filters.format, status: filters.status},
      });
    return mapAssets(response.status, response.body, response.bodyKind);
  } catch (err) {
    return catchNet(err);
  }
}

/** GET /content/:content_id/assets/best?format= (404 NO_AVAILABLE_ASSET si aucun). */
export async function fetchBestAsset(
  contentId: number,
  format?: string,
): Promise<AssetResult> {
  if (!validId(contentId)) {
    return failure('validation', null, 'INVALID_ID');
  }
  try {
    const response = await http
      .service('content')
      .get(`/content/${contentId}/assets/best`, {
        auth: 'none',
        query: {format},
      });
    return mapSingleAsset(response.status, response.body, response.bodyKind);
  } catch (err) {
    return catchNet(err);
  }
}

/** GET /assets/:id */
export async function fetchAsset(id: number): Promise<AssetResult> {
  if (!validId(id)) {
    return failure('validation', null, 'INVALID_ID');
  }
  try {
    const response = await http
      .service('content')
      .get(`/assets/${id}`, {auth: 'none'});
    return mapSingleAsset(response.status, response.body, response.bodyKind);
  } catch (err) {
    return catchNet(err);
  }
}
