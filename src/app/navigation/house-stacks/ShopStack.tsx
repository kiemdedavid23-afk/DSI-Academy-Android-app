/**
 * Pile Boutique (L8b) : catalogue, fiche, favoris — la pile commune sur la
 * source `shop`. Panier et code promo (L8d-2), achat (L8c).
 */

import React from 'react';
import {CommerceStack} from './CommerceStack';

export function ShopStack() {
  return <CommerceStack source="shop" />;
}
