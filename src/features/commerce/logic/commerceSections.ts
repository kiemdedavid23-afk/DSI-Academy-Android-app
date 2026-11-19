/**
 * Sections de la coque Marketplace / Boutique (une seule coque, deux sources).
 * Marketplace : Découvrir, Explorer, Mes achats, Vendeur. Boutique : sans Vendeur.
 */

import type {CommerceSource} from '../store/commerceTypes';

export type CommerceSection = 'discover' | 'explore' | 'purchases' | 'seller';
export type PurchasesTab = 'purchases' | 'favorites' | 'history' | 'codes';

const MARKETPLACE_SECTIONS: readonly CommerceSection[] = [
  'discover',
  'explore',
  'purchases',
  'seller',
];
const SHOP_SECTIONS: readonly CommerceSection[] = ['discover', 'explore', 'purchases'];

export const PURCHASES_TABS: readonly PurchasesTab[] = [
  'purchases',
  'favorites',
  'history',
  'codes',
];

export function sectionsFor(source: CommerceSource): readonly CommerceSection[] {
  return source === 'shop' ? SHOP_SECTIONS : MARKETPLACE_SECTIONS;
}

/** Section demandée si la maison la propose, sinon Découvrir. */
export function resolveSection(
  source: CommerceSource,
  wanted: CommerceSection | undefined,
): CommerceSection {
  return wanted && sectionsFor(source).includes(wanted) ? wanted : 'discover';
}

/** Une illustration d'ambiance par section (les 4 visuels de la Marketplace). */
export const HERO_ART_INDEX: Record<CommerceSection, number> = {
  discover: 0,
  explore: 1,
  purchases: 2,
  seller: 3,
};
