/**
 * Gains (lot S8) : `GET /seller/earnings`, solde réel du Paiement et journal
 * des crédits paginé. 503 `CONFIG` (Paiement injoignable) : erreur `CONFIG`,
 * aucune donnée partielle et aucun solde inventé (D14). Purgé à la déconnexion.
 */

import {createStore} from 'zustand/vanilla';
import {fetchSellerEarnings} from '@core/api/endpoints/marketplace/seller/seller.api';
import {storeRegistry} from '@shared/store';
import type {SellerLedgerEntry} from '../../store/sellerTypes';

export type SellerEarningsState = {
  availableDsi: number | null;
  pendingDsi: number;
  ledger: SellerLedgerEntry[];
  nextCursor: string | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  loadingMore: boolean;
  error: string | null;
};

const INITIAL: SellerEarningsState = {
  availableDsi: null,
  pendingDsi: 0,
  ledger: [],
  nextCursor: null,
  status: 'idle',
  loadingMore: false,
  error: null,
};

export const sellerEarningsStore = createStore<SellerEarningsState>(() => INITIAL);
const set = sellerEarningsStore.setState;
const get = sellerEarningsStore.getState;

let generation = 0;

export const sellerEarnings = {
  async load(): Promise<void> {
    const gen = generation;
    set({status: 'loading', error: null});
    const res = await fetchSellerEarnings();
    if (gen !== generation) {
      return;
    }
    if (res.kind === 'failure') {
      // Pas de solde partiel : on efface l'ancien pour ne jamais montrer un chiffre périmé.
      set({
        status: 'error',
        error: res.code === 'CONFIG' ? 'CONFIG' : res.errorKind,
        availableDsi: null,
        ledger: [],
        nextCursor: null,
      });
      return;
    }
    set({
      status: 'success',
      availableDsi: res.earnings.availableDsi,
      pendingDsi: res.earnings.pendingDsi,
      ledger: res.earnings.ledger,
      nextCursor: res.earnings.nextCursor,
      error: null,
    });
  },

  async loadMore(): Promise<void> {
    const gen = generation;
    const {nextCursor, loadingMore} = get();
    if (!nextCursor || loadingMore) {
      return;
    }
    set({loadingMore: true});
    const res = await fetchSellerEarnings({cursor: nextCursor});
    if (gen !== generation) {
      return;
    }
    if (res.kind === 'failure') {
      set({loadingMore: false});
      return;
    }
    const known = new Set(get().ledger.map(e => e.id));
    set({
      loadingMore: false,
      ledger: [...get().ledger, ...res.earnings.ledger.filter(e => !known.has(e.id))],
      nextCursor: res.earnings.nextCursor,
    });
  },

  reset(): void {
    generation += 1;
    set(INITIAL);
  },
};

storeRegistry.register({purge: sellerEarnings.reset});
