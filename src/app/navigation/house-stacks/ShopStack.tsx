/**
 * Pile Boutique (L8b) : catalogue, fiche, favoris — la pile commune sur la
 * source `shop`. Panier et code promo arrivent en L8d, l'achat en L8c.
 */

import React from 'react';
import {CommerceStack} from './CommerceStack';

export function ShopStack() {
  return <CommerceStack source="shop" />;
}
