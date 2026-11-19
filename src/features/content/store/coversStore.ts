/**
 * Couvertures d'une maison pour les éventails du bandeau : une requête par
 * maison, conservées 24 h (liste stable, pas de re-mélange à chaque ouverture).
 */

import {fetchCovers} from '@core/api/endpoints/content/covers.api';
import type {CoverItem} from '@core/api/endpoints/content/covers.types';
import type {ContentType} from '@core/utils/contentDisplay';
import {createResourceStore} from '@shared/store';

/** Type réexporté : les composants n'importent pas @core/api (R-LAY-6). */
export type {CoverItem};

const TTL_MS = 24 * 60 * 60_000;
export const FAN_COVERS = 16;

export function createCoversStore(type: ContentType, limit = FAN_COVERS) {
  return createResourceStore<CoverItem[]>({
    ttlMs: TTL_MS,
    fetcher: async () => {
      const res = await fetchCovers({type, limit});
      if (res.kind === 'failure') {
        throw new Error(res.errorKind);
      }
      return res.items;
    },
  });
}
