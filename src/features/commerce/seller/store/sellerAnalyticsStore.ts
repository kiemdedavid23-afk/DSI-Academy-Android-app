/**
 * Analyses de l'espace vendeur (lot S7) : `GET /seller/analytics` pour une
 * période (30 jours par défaut). Une réponse tardive d'une autre période ou
 * d'une ancienne session est ignorée. Purgé à la déconnexion.
 */

import {createStore} from 'zustand/vanilla';
import {fetchSellerAnalytics} from '@core/api/endpoints/marketplace/seller/seller.api';
import {storeRegistry} from '@shared/store';
import type {SellerAnalytics, SellerPeriod} from '../../store/sellerTypes';

export type SellerAnalyticsState = {
  period: SellerPeriod;
  data: SellerAnalytics | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
};

const INITIAL: SellerAnalyticsState = {
  period: '30d',
  data: null,
  status: 'idle',
  error: null,
};

export const sellerAnalyticsStore = createStore<SellerAnalyticsState>(() => INITIAL);
const set = sellerAnalyticsStore.setState;
const get = sellerAnalyticsStore.getState;

let generation = 0;

async function load(): Promise<void> {
  const gen = generation;
  const {period} = get();
  set({status: 'loading', error: null});
  const res = await fetchSellerAnalytics(period);
  if (gen !== generation || get().period !== period) {
    return;
  }
  if (res.kind === 'failure') {
    set({status: 'error', error: res.errorKind});
    return;
  }
  set({status: 'success', data: res.analytics, error: null});
}

export const sellerAnalytics = {
  load,
  async setPeriod(period: SellerPeriod): Promise<void> {
    set({period});
    await load();
  },
  reset(): void {
    generation += 1;
    set(INITIAL);
  },
};

storeRegistry.register({purge: sellerAnalytics.reset});
