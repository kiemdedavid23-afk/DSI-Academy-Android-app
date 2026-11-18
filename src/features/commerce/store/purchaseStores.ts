/**
 * Achat, « Mes achats » et solde DSI communs (L8c).
 * Règles d'achat (décision P3/P4) :
 * - une clé d'idempotence par intention d'achat ;
 * - résultat incertain (réseau, 502 Marketplace, 503) : on rejoue avec la
 *   MÊME clé, jamais une nouvelle, pour ne débiter qu'une fois ;
 * - échec net (solde, abonnement, refus) : nouvelle clé au nouvel essai.
 */

import {getCommerceApi} from '@core/api/endpoints/commerce/commerce.sources';
import {createCheckoutKey} from '@core/api/endpoints/commerce/commerce.idempotency';
import type {
  AccessParams,
  CommerceErrorKind,
  CommerceOrder,
  CommerceOrderState,
  CommerceProduct,
  CommerceSource,
} from '@core/api/endpoints/commerce/commerce.types';
import {fetchMemberBalance} from '@core/api/endpoints/payment/membre.api';
import {storeRegistry} from '@shared/store';
import {createSimpleStore} from './simpleStore';
import type {LoadStatus} from './commerceStores';

/* --------------------------------- Solde --------------------------------- */

export type BalanceState = {
  amount: number | null;
  status: LoadStatus;
};

function createBalanceStore() {
  const store = createSimpleStore<BalanceState>({amount: null, status: 'idle'});
  let generation = 0;
  const self = {
    getState: store.getState,
    subscribe: store.subscribe,
    /** Solde actuel (lecture seule : la gestion reste dans la pièce DSI). */
    load: async (opts?: {force?: boolean}) => {
      const s = store.getState();
      if (!opts?.force && (s.status === 'success' || s.status === 'loading')) {
        return;
      }
      generation += 1;
      const mine = generation;
      store.setState({status: 'loading'});
      const res = await fetchMemberBalance();
      if (mine !== generation) {
        return;
      }
      if (res.kind === 'failure') {
        store.setState({status: 'error'});
        return;
      }
      store.setState({status: 'success', amount: res.data.soldeDsiActuel});
    },
    reset: () => {
      generation += 1;
      store.replace({amount: null, status: 'idle'});
    },
    purge: () => self.reset(),
  };
  storeRegistry.register(self);
  return self;
}

export const commerceBalanceStore = createBalanceStore();

/* -------------------------------- Mes achats ------------------------------ */

export type OrdersState = {
  items: CommerceOrder[];
  status: LoadStatus;
  errorKind: CommerceErrorKind | null;
  /** Commande en cours de vérification (un seul bouton occupé à la fois). */
  verifyingId: string | null;
};

export type AccessResult =
  | {ok: true; url: string; mode: 'webview' | 'external'}
  | {ok: false; errorKind: CommerceErrorKind};

const initialOrders = (): OrdersState => ({
  items: [],
  status: 'idle',
  errorKind: null,
  verifyingId: null,
});

function byNewest(a: CommerceOrder, b: CommerceOrder): number {
  return (b.createdAt ?? 0) - (a.createdAt ?? 0);
}

export function createOrdersStore(source: CommerceSource) {
  const api = getCommerceApi(source);
  const store = createSimpleStore<OrdersState>(initialOrders());
  let generation = 0;

  const self = {
    getState: store.getState,
    subscribe: store.subscribe,
    load: async (opts?: {force?: boolean}) => {
      const s = store.getState();
      if (!opts?.force && (s.status === 'success' || s.status === 'loading')) {
        return;
      }
      generation += 1;
      const mine = generation;
      // La liste déjà affichée reste visible pendant un rechargement.
      store.setState({status: 'loading', errorKind: null});
      const res = await api.fetchOrders();
      if (mine !== generation) {
        return;
      }
      if (res.kind === 'failure') {
        store.setState({status: 'error', errorKind: res.errorKind});
        return;
      }
      store.setState({status: 'success', items: [...res.orders].sort(byNewest)});
    },
    /** Vérifier une commande en cours : ne crée jamais un second débit. */
    verify: async (orderId: string): Promise<{ok: boolean; errorKind?: CommerceErrorKind}> => {
      if (store.getState().verifyingId !== null) {
        return {ok: true};
      }
      store.setState({verifyingId: orderId});
      try {
        const res = await api.verifyOrder(orderId);
        if (res.kind === 'failure') {
          return {ok: false, errorKind: res.errorKind};
        }
        const next = res.order;
        store.setState({
          items: store
            .getState()
            .items.map(o =>
              o.id === orderId
                ? {...o, status: next.status, rawStatus: next.rawStatus}
                : o,
            ),
        });
        return {ok: true};
      } finally {
        store.setState({verifyingId: null});
      }
    },
    /** Ouvrir un produit acheté. L'écran décide comment ouvrir l'URL. */
    access: async (params: AccessParams): Promise<AccessResult> => {
      const res = await api.access(params);
      if (res.kind === 'failure') {
        return {ok: false, errorKind: res.errorKind};
      }
      return {ok: true, url: res.url, mode: res.mode};
    },
    reset: () => {
      generation += 1;
      store.replace(initialOrders());
    },
    purge: () => self.reset(),
  };
  storeRegistry.register(self);
  return self;
}

/* --------------------------------- Achat --------------------------------- */

export type PurchasePhase =
  | 'idle'
  | 'confirming'
  | 'processing'
  | 'pending'
  | 'indeterminate'
  | 'paid'
  | 'failed';

export type PurchaseState = {
  phase: PurchasePhase;
  product: CommerceProduct | null;
  key: string | null;
  order: CommerceOrderState | null;
  errorKind: CommerceErrorKind | null;
  verifying: boolean;
  /** Dernière vérification sans réponse : l'achat reste « en cours ». */
  verifyFailed: boolean;
  /** Code promo du panier Boutique (L8d), envoyé au checkout. */
  promoCode: string | null;
  /** Achat du panier Boutique : pas d'ouverture d'un produit unique. */
  cart: boolean;
};

const initialPurchase = (): PurchaseState => ({
  phase: 'idle',
  product: null,
  key: null,
  order: null,
  errorKind: null,
  verifying: false,
  verifyFailed: false,
  promoCode: null,
  cart: false,
});

/** Échecs après lesquels le résultat est incertain : on rejoue avec la même clé. */
const KEEP_KEY_KINDS: CommerceErrorKind[] = [
  'network',
  'indeterminate',
  'upstream',
  'server',
  'unavailable',
  'invalidResponse',
];

export function createPurchaseStore(
  source: CommerceSource,
  hooks: {onPaid: () => void},
) {
  const api = getCommerceApi(source);
  const store = createSimpleStore<PurchaseState>(initialPurchase());
  let busy = false;

  function settle(order: CommerceOrderState) {
    if (order.status === 'paid') {
      store.setState({phase: 'paid', order, errorKind: null});
      hooks.onPaid();
    } else if (order.status === 'failed') {
      store.setState({phase: 'failed', order, errorKind: 'paymentRefused'});
    } else {
      store.setState({phase: 'pending', order, errorKind: null});
    }
  }

  const self = {
    getState: store.getState,
    subscribe: store.subscribe,
    /** Ouvre la confirmation : nouvelle intention = nouvelle clé. */
    start: (
      product: CommerceProduct,
      opts?: {promoCode?: string | null; cart?: boolean},
    ) => {
      if (busy) {
        return;
      }
      store.replace({
        ...initialPurchase(),
        phase: 'confirming',
        product,
        key: createCheckoutKey(),
        promoCode: opts?.promoCode ?? null,
        cart: opts?.cart === true,
      });
    },
    /** Confirme l'achat, ou le rejoue avec la même clé après un résultat incertain. */
    confirm: async () => {
      const s = store.getState();
      if (busy || !s.product || !s.key) {
        return;
      }
      if (s.phase !== 'confirming' && s.phase !== 'indeterminate') {
        return;
      }
      busy = true;
      store.setState({phase: 'processing', errorKind: null});
      try {
        const res = await api.purchase({
          productId: s.product.id,
          idempotencyKey: s.key,
          promoCode: s.promoCode ?? undefined,
        });
        if (res.kind === 'failure') {
          store.setState({
            phase: KEEP_KEY_KINDS.includes(res.errorKind) ? 'indeterminate' : 'failed',
            errorKind: res.errorKind,
          });
          return;
        }
        settle(res.order);
      } finally {
        busy = false;
      }
    },
    /** Nouvel essai après un échec net : nouvelle clé. */
    retry: () => {
      const s = store.getState();
      if (busy || s.phase !== 'failed' || !s.product) {
        return;
      }
      store.replace({
        ...initialPurchase(),
        phase: 'confirming',
        product: s.product,
        key: createCheckoutKey(),
        promoCode: s.promoCode,
        cart: s.cart,
      });
    },
    /** Vérifier un paiement en cours (reconcile / relecture), sans second débit. */
    verify: async () => {
      const s = store.getState();
      if (busy || !s.order || s.phase !== 'pending') {
        return;
      }
      busy = true;
      store.setState({verifying: true, verifyFailed: false});
      try {
        const res = await api.verifyOrder(s.order.orderId);
        if (res.kind === 'failure') {
          store.setState({verifyFailed: true});
          return;
        }
        settle(res.order);
      } finally {
        busy = false;
        store.setState({verifying: false});
      }
    },
    /** Ferme la fenêtre. Un achat en cours reste visible dans « Mes achats ». */
    dismiss: () => {
      if (busy) {
        return;
      }
      store.replace(initialPurchase());
    },
    reset: () => {
      busy = false;
      store.replace(initialPurchase());
    },
    purge: () => self.reset(),
  };
  storeRegistry.register(self);
  return self;
}
