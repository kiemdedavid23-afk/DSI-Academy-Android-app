/**
 * Les quatre maisons (site : houseVisuals.js). L'identité visuelle vit dans
 * @shared/houses (partagée avec la feature content) ; ici seulement la
 * disponibilité propre au hub.
 */

import {
  continueContentId,
  HOUSE_ORDER,
  HOUSE_VISUALS,
  type HouseId,
  type HouseVisual,
} from '@shared/houses/houseVisuals';

export type {HouseId};
export {continueContentId, HOUSE_ORDER};

export type HouseDef = HouseVisual & {available: boolean};

export const HOUSES = Object.fromEntries(
  HOUSE_ORDER.map(id => [id, {...HOUSE_VISUALS[id], available: true}]),
) as Record<HouseId, HouseDef>;
