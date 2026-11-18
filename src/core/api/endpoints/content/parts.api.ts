import {cached} from '../../../cache/diskCache';
import {http} from '@core/network';
import {catchNet} from './common.api';
import {failure} from './common.mapper';
import {mapNavigation, mapParts} from './parts.mapper';
import type {
  NavigationResult,
  NavigationScope,
  PartsResult,
} from './parts.types';

function validId(id: number): boolean {
  return Number.isInteger(id) && id > 0;
}

/** GET /content/:id/parts (parties directes, Worker v1.2). */
async function fetchPartsRemote(id: number): Promise<PartsResult> {
  if (!validId(id)) {
    return failure('validation', null, 'INVALID_ID');
  }
  try {
    const response = await http
      .service('content')
      .get(`/content/${id}/parts`, {auth: 'none'});
    return mapParts(response.status, response.body, response.bodyKind);
  } catch (err) {
    return catchNet(err);
  }
}

/** GET /content/:id/parts/tree?depth= (profondeur 1 à 16, défaut 16). */
async function fetchPartsTreeRemote(
  id: number,
  depth?: number,
): Promise<PartsResult> {
  if (!validId(id)) {
    return failure('validation', null, 'INVALID_ID');
  }
  try {
    const response = await http.service('content').get(
      `/content/${id}/parts/tree`,
      {auth: 'none', query: {depth}},
    );
    return mapParts(response.status, response.body, response.bodyKind);
  } catch (err) {
    return catchNet(err);
  }
}

/**
 * GET /content/:id/navigation?scope=parent|work : place d'une partie et
 * voisins (précédent / suivant). Pas de cache : dépend de l'état de lecture.
 */
export async function fetchNavigation(
  id: number,
  scope: NavigationScope = 'parent',
): Promise<NavigationResult> {
  if (!validId(id)) {
    return failure('validation', null, 'INVALID_ID');
  }
  try {
    const response = await http
      .service('content')
      .get(`/content/${id}/navigation`, {auth: 'none', query: {scope}});
    return mapNavigation(response.status, response.body, response.bodyKind);
  } catch (err) {
    return catchNet(err);
  }
}

export function fetchParts(id: number): Promise<PartsResult> {
  return cached(`parts:${id}`, () => fetchPartsRemote(id));
}

export function fetchPartsTree(id: number, depth?: number): Promise<PartsResult> {
  return cached(`partsTree:${id}:${depth ?? 'max'}`, () =>
    fetchPartsTreeRemote(id, depth),
  );
}
