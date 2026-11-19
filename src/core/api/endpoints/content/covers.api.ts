import {http} from '@core/network';
import {cached} from '../../../cache/diskCache';
import {fetchCatalogue} from './catalogue.api';
import {catchNet} from './common.api';
import {coversFromContents, mapCovers} from './covers.mapper';
import type {CoversParams, CoversResult} from './covers.types';

const DEFAULT_LIMIT = 16;
const MAX_LIMIT = 24;
/** Page de catalogue lue pour le repli : de quoi trouver assez de couvertures. */
const FALLBACK_PAGE = 60;

async function fetchCoversRemote(params: CoversParams): Promise<CoversResult> {
  const limit = Math.min(Math.max(params.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  try {
    const response = await http
      .service('content')
      .get('/content/covers', {auth: 'none', query: {type: params.type, limit}});
    const res = mapCovers(response.status, response.body, response.bodyKind);
    if (res.kind === 'success' || res.errorKind !== 'notFound') {
      return res;
    }
  } catch (err) {
    return catchNet(err);
  }
  // Route absente (Worker plus ancien) : repli sur le catalogue.
  const page = await fetchCatalogue({type: params.type, limit: FALLBACK_PAGE});
  if (page.kind === 'failure') {
    return page;
  }
  return {kind: 'success', items: coversFromContents(page.items, limit)};
}

/**
 * GET /content/covers (Worker v1.3) : liens de couverture seulement, pour les
 * éventails des bandeaux. Cache disque 24 h ; repli sur le catalogue si la
 * route n'existe pas encore.
 */
export function fetchCovers(params: CoversParams): Promise<CoversResult> {
  return cached(`covers:${params.type}:${params.limit ?? DEFAULT_LIMIT}`, () =>
    fetchCoversRemote(params),
  );
}
