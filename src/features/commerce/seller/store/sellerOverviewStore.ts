/**
 * Aperçu de l'espace vendeur (lot S4) : `GET /seller/overview` sur 30 jours.
 * Même modèle que les autres stores de ressource : {data, status, error,
 * updatedAt}. Aucune donnée partielle : si le Worker répond 503 CONFIG (solde
 * indisponible), l'écran affiche l'erreur, pas un aperçu amputé. Purgé à la
 * déconnexion.
 */

import {fetchSellerOverview} from '@core/api/endpoints/marketplace/seller/seller.api';
import type {SellerOverview} from '@core/api/endpoints/marketplace/seller/seller.types';
import {createResourceStore, storeRegistry} from '@shared/store';

const TTL_MS = 60_000;

async function load(): Promise<SellerOverview> {
  const res = await fetchSellerOverview('30d');
  if (res.kind === 'failure') {
    throw new Error(res.code === 'CONFIG' ? 'CONFIG' : res.errorKind);
  }
  return res.overview;
}

export const sellerOverviewStore = createResourceStore<SellerOverview>({
  ttlMs: TTL_MS,
  fetcher: load,
});

storeRegistry.register(sellerOverviewStore);
