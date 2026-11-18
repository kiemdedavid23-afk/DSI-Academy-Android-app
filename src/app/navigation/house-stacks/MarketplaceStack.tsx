/**
 * Pile Marketplace (L8b) : catalogue, fiche, favoris — la pile commune sur la
 * source `marketplace`. Tendances, vendeurs et avis arrivent en L9a.
 */

import React from 'react';
import {CommerceStack} from './CommerceStack';

export function MarketplaceStack() {
  return <CommerceStack source="marketplace" />;
}
