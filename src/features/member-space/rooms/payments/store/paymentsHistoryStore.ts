/**
 * Historique des paiements — cache par page, limit 20 fixe (site).
 */

import {fetchMemberPayments} from '@core/api/endpoints/payment/paiements.api';
import type {
  MemberPayment,
  MemberPaymentsPage,
} from '@core/api/endpoints/payment/paiements.types';

type Listener = () => void;

export type PaymentsHistoryState = {
  page: number;
  total: number;
  totalPages: number;
  items: MemberPayment[];
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  notFound: boolean;
  /** true pendant un changement de page (liste reste visible) */
  pageLoading: boolean;
};

const cache = new Map<number, MemberPaymentsPage>();
let state: PaymentsHistoryState = {
  page: 1,
  total: 0,
  totalPages: 0,
  items: [],
  status: 'idle',
  error: null,
  notFound: false,
  pageLoading: false,
};
const listeners = new Set<Listener>();
let inFlight: Promise<void> | null = null;
let inFlightPage = 0;

function emit(): void {
  listeners.forEach(l => l());
}

function set(patch: Partial<PaymentsHistoryState>): void {
  state = {...state, ...patch};
  emit();
}

async function loadPage(page: number, opts?: {force?: boolean}): Promise<void> {
  const p = page >= 1 ? Math.floor(page) : 1;
  if (!opts?.force && cache.has(p) && p === state.page && state.status === 'success') {
    return;
  }
  if (inFlight && inFlightPage === p) {
    return inFlight;
  }
  const hasVisible = state.items.length > 0;
  set({
    status: hasVisible ? state.status : 'loading',
    pageLoading: hasVisible,
    error: null,
    notFound: false,
  });
  inFlightPage = p;
  inFlight = (async () => {
    const res = await fetchMemberPayments(p);
    if (res.kind === 'failure') {
      set({
        status: hasVisible ? 'success' : 'error',
        pageLoading: false,
        error: res.notFound
          ? 'payments.accountNotFound'
          : res.message ?? 'payments.errorLoad',
        notFound: Boolean(res.notFound),
      });
      inFlight = null;
      return;
    }
    cache.set(p, res.data);
    set({
      page: res.data.page,
      total: res.data.total,
      totalPages: res.data.totalPages,
      items: res.data.paiements,
      status: 'success',
      pageLoading: false,
      error: null,
      notFound: false,
    });
    inFlight = null;
  })();
  return inFlight;
}

export const paymentsHistoryStore = {
  getState: () => state,
  subscribe(l: Listener) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  load: (page = 1, opts?: {force?: boolean}) => loadPage(page, opts),
  nextPage() {
    if (state.page < state.totalPages && !state.pageLoading) {
      void loadPage(state.page + 1);
    }
  },
  prevPage() {
    if (state.page > 1 && !state.pageLoading) {
      void loadPage(state.page - 1);
    }
  },
  invalidate() {
    cache.clear();
  },
  purge() {
    cache.clear();
    state = {
      page: 1,
      total: 0,
      totalPages: 0,
      items: [],
      status: 'idle',
      error: null,
      notFound: false,
      pageLoading: false,
    };
    emit();
  },
};
