/**
 * Ventes de l'espace vendeur (lot S6) : résumé de la période, liste filtrée
 * (Toutes / Payées / En attente) et pagination par curseur
 * (`GET /seller/orders`). Période par défaut : `all`. Export : toutes les
 * pages de la sélection courante, plafonnées. Purgé à la déconnexion.
 */

import {createStore} from 'zustand/vanilla';
import {fetchSellerOrders} from '@core/api/endpoints/marketplace/seller/seller.api';
import {storeRegistry} from '@shared/store';
import type {
  SellerOrderItem,
  SellerOrdersSummary,
  SellerPeriod,
} from '../../store/sellerTypes';
import {EXPORT_MAX_PAGES, ordersToCsv, type OrderFilter} from '../logic/sellerOrders';

export type SellerOrdersState = {
  period: SellerPeriod;
  filter: OrderFilter;
  summary: SellerOrdersSummary | null;
  items: SellerOrderItem[];
  nextCursor: string | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  loadingMore: boolean;
  error: string | null;
  exporting: boolean;
};

const INITIAL: SellerOrdersState = {
  period: 'all',
  filter: 'all',
  summary: null,
  items: [],
  nextCursor: null,
  status: 'idle',
  loadingMore: false,
  error: null,
  exporting: false,
};

export const sellerOrdersStore = createStore<SellerOrdersState>(() => INITIAL);
const set = sellerOrdersStore.setState;
const get = sellerOrdersStore.getState;

/** Incrémenté à la purge : une réponse tardive d'une ancienne session est ignorée. */
let generation = 0;

async function loadFirstPage(): Promise<void> {
  const gen = generation;
  const {period, filter} = get();
  set({status: 'loading', error: null});
  const res = await fetchSellerOrders({period, status: filter});
  if (gen !== generation) {
    return;
  }
  if (res.kind === 'failure') {
    set({status: 'error', error: res.errorKind});
    return;
  }
  set({
    status: 'success',
    summary: res.page.summary,
    items: res.page.items,
    nextCursor: res.page.nextCursor,
    error: null,
  });
}

export const sellerOrders = {
  load: loadFirstPage,

  async loadMore(): Promise<void> {
    const gen = generation;
    const {nextCursor, loadingMore, period, filter} = get();
    if (!nextCursor || loadingMore) {
      return;
    }
    set({loadingMore: true});
    const res = await fetchSellerOrders({period, status: filter, cursor: nextCursor});
    if (gen !== generation) {
      return;
    }
    if (res.kind === 'failure') {
      set({loadingMore: false});
      return;
    }
    const known = new Set(get().items.map(i => i.id));
    set({
      loadingMore: false,
      items: [...get().items, ...res.page.items.filter(i => !known.has(i.id))],
      nextCursor: res.page.nextCursor,
    });
  },

  async setPeriod(period: SellerPeriod): Promise<void> {
    set({period});
    await loadFirstPage();
  },

  async setFilter(filter: OrderFilter): Promise<void> {
    set({filter});
    await loadFirstPage();
  },

  /** CSV de la sélection courante (période et statut). `null` si une page échoue. */
  async exportCsv(): Promise<string | null> {
    if (get().exporting) {
      return null;
    }
    const gen = generation;
    const {period, filter} = get();
    set({exporting: true});
    const rows: SellerOrderItem[] = [];
    let cursor: string | null = null;
    for (let page = 0; page < EXPORT_MAX_PAGES; page += 1) {
      const res = await fetchSellerOrders({period, status: filter, limit: 100, cursor});
      if (gen !== generation) {
        return null;
      }
      if (res.kind === 'failure') {
        set({exporting: false});
        return null;
      }
      rows.push(...res.page.items);
      cursor = res.page.nextCursor;
      if (!cursor) {
        break;
      }
    }
    set({exporting: false});
    return ordersToCsv(rows);
  },

  reset(): void {
    generation += 1;
    set(INITIAL);
  },
};

storeRegistry.register({purge: sellerOrders.reset});
