import {http} from '@core/network';
import {catchNet} from './common.api';
import {failure} from './common.mapper';
import {mapComponents, mapTree} from './composition.mapper';
import type {ComponentsResult, TreeResult} from './composition.types';

function validId(id: number): boolean {
  return Number.isInteger(id) && id > 0;
}

/** GET /content/:parent_id/components (composants actifs seulement, par défaut). */
export async function fetchComponents(
  parentId: number,
): Promise<ComponentsResult> {
  if (!validId(parentId)) {
    return failure('validation', null, 'INVALID_ID');
  }
  try {
    const response = await http
      .service('content')
      .get(`/content/${parentId}/components`, {auth: 'none'});
    return mapComponents(response.status, response.body, response.bodyKind);
  } catch (err) {
    return catchNet(err);
  }
}

/** GET /content/:parent_id/components/tree (profondeur max 10). */
export async function fetchComponentTree(
  parentId: number,
): Promise<TreeResult> {
  if (!validId(parentId)) {
    return failure('validation', null, 'INVALID_ID');
  }
  try {
    const response = await http
      .service('content')
      .get(`/content/${parentId}/components/tree`, {auth: 'none'});
    return mapTree(response.status, response.body, response.bodyKind);
  } catch (err) {
    return catchNet(err);
  }
}
