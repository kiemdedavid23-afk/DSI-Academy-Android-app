/**
 * Machine d'états du renouvellement (L3a).
 * Token de suivi en MÉMOIRE uniquement (jamais Keychain / logs).
 * Un seul POST à la fois. Poll statut 4 s, timeout 5 min, pause AppState.
 */

import {AppState, type AppStateStatus} from 'react-native';
import {renewSubscription} from '@core/api/endpoints/payment/abonnement.api';
import type {RenewFcfaPayment} from '@core/api/endpoints/payment/abonnement.types';
import {
  fetchPaymentNetworks,
  fetchPaymentStatus,
} from '@core/api/endpoints/payment/paiement.api';
import type {PaymentNetwork, PaymentNetworksCatalog} from '@core/api/endpoints/payment/paiement.types';
import {openSecureBrowser} from '@core/platform/openSecureBrowser';
import {sessionStore} from '@core/session';
import {computeSubscription} from '@core/utils/subscription';
import {
  memberProfileStore,
  memberSubscriptionStore,
} from '@shared/store';
import {loadHomeDashboard} from '../../home/store/homeDashboardStore';

const POLL_MS = 4000;
const MAX_POLL_MS = 5 * 60 * 1000;

export type RenewalPhase =
  | 'idle'
  | 'choose_mode'
  | 'dsi_confirm'
  | 'fcfa_loading_networks'
  | 'fcfa_pick_network'
  | 'fcfa_form'
  | 'fcfa_hosted_confirm'
  | 'submitting'
  | 'tracking'
  | 'tracking_timeout'
  | 'success'
  | 'error';

export type RenewalState = {
  phase: RenewalPhase;
  /** Message d'erreur ou de succès affiché */
  message: string | null;
  catalogue: PaymentNetworksCatalog | null;
  selectedNetwork: PaymentNetwork | null;
  numeroPaiement: string;
  otp: string;
  email: string;
  fieldErrors: Partial<Record<'numeroPaiement' | 'otp' | 'emailPaiement', string>>;
  /** paymentUrl hosted (mémoire) pour « Rouvrir » */
  paymentUrl: string | null;
  /** true tant qu'un suivi est actif ou en timeout avec token */
  paymentInProgress: boolean;
  /** POST en cours — verrou anti double envoi */
  submitting: boolean;
};

type Listener = () => void;

const initial: RenewalState = {
  phase: 'idle',
  message: null,
  catalogue: null,
  selectedNetwork: null,
  numeroPaiement: '',
  otp: '',
  email: '',
  fieldErrors: {},
  paymentUrl: null,
  paymentInProgress: false,
  submitting: false,
};

let state: RenewalState = {...initial};
/** Token de suivi — hors état exposé */
let trackingToken: string | null = null;
let pollTimer: ReturnType<typeof setTimeout> | null = null;
let pollStartedAt = 0;
let appSub: {remove: () => void} | null = null;
let foreground = true;
const listeners = new Set<Listener>();

function emit(): void {
  listeners.forEach(l => l());
}

function setState(patch: Partial<RenewalState>): void {
  state = {...state, ...patch};
  emit();
}

function clearPoll(): void {
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
}

function clearSensitiveFields(): void {
  setState({
    numeroPaiement: '',
    otp: '',
    email: '',
    fieldErrors: {},
  });
}

async function afterSuccess(message: string | null): Promise<void> {
  clearPoll();
  trackingToken = null;
  clearSensitiveFields();
  setState({
    phase: 'success',
    message,
    paymentInProgress: false,
    submitting: false,
    paymentUrl: null,
  });

  // Invalidate + reload
  await memberSubscriptionStore.load();
  await memberProfileStore.load();
  try {
    await loadHomeDashboard();
  } catch {
    /* balance via dashboard */
  }

  const sub = memberSubscriptionStore.getState().data;
  if (sub) {
    const computed = computeSubscription(sub);
    await sessionStore.updateSubscription({
      subscriptionStatus: sub.statut,
      dateFin: sub.dateFin,
      subscriptionActive: computed.state === 'active',
    });
  }
}

function schedulePoll(): void {
  clearPoll();
  if (!trackingToken || !foreground) {
    return;
  }
  const elapsed = Date.now() - pollStartedAt;
  if (elapsed >= MAX_POLL_MS) {
    setState({phase: 'tracking_timeout', paymentInProgress: true});
    return;
  }
  pollTimer = setTimeout(() => {
    void runPoll();
  }, POLL_MS);
}

async function runPoll(): Promise<void> {
  const token = trackingToken;
  if (!token) {
    return;
  }
  const res = await fetchPaymentStatus(token);
  if (res.kind === 'failure') {
    if (res.sessionExpired) {
      setState({
        phase: 'error',
        message: res.message ?? null,
        paymentInProgress: false,
        submitting: false,
      });
      trackingToken = null;
      return;
    }
    // réseau : continuer le poll si possible
    schedulePoll();
    return;
  }
  if (res.status === 'active') {
    await afterSuccess(null);
    return;
  }
  if (res.status === 'refuse' || res.status === 'introuvable') {
    clearPoll();
    trackingToken = null;
    clearSensitiveFields();
    setState({
      phase: 'error',
      message: null,
      paymentInProgress: false,
      submitting: false,
      paymentUrl: null,
    });
    return;
  }
  // attente / non_initie
  setState({phase: 'tracking', paymentInProgress: true});
  schedulePoll();
}

function ensureAppState(): void {
  if (appSub) {
    return;
  }
  appSub = AppState.addEventListener('change', (next: AppStateStatus) => {
    const active = next === 'active';
    foreground = active;
    if (active && trackingToken && state.phase === 'tracking') {
      void runPoll();
    } else if (!active) {
      clearPoll();
    }
  });
}

export const subscriptionRenewalStore = {
  getState(): RenewalState {
    return state;
  },

  /** Token jamais exposé dans getState */
  hasTrackingToken(): boolean {
    return trackingToken != null;
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  openPanel(): void {
    if (state.paymentInProgress && trackingToken) {
      setState({phase: 'tracking', message: null});
      return;
    }
    setState({
      phase: 'choose_mode',
      message: null,
      catalogue: null,
      selectedNetwork: null,
    });
  },

  closePanel(): void {
    if (state.paymentInProgress) {
      // garde le suivi en mémoire mais ferme le panneau visuellement
      setState({phase: 'idle'});
      return;
    }
    this.reset();
  },

  reset(): void {
    clearPoll();
    trackingToken = null;
    state = {...initial};
    emit();
  },

  /** Quitte l'écran : annule poll, vide champs, garde token seulement si encore en cours? Fiche: annulation propre. */
  leaveScreen(): void {
    clearPoll();
    clearSensitiveFields();
    if (!trackingToken) {
      state = {...initial};
      emit();
    } else {
      setState({phase: 'idle', numeroPaiement: '', otp: '', email: '', fieldErrors: {}});
    }
  },

  chooseDsi(): void {
    setState({phase: 'dsi_confirm', message: null});
  },

  async chooseFcfa(): Promise<void> {
    setState({
      phase: 'fcfa_loading_networks',
      message: null,
      catalogue: null,
      selectedNetwork: null,
    });
    const profile = memberProfileStore.getState().data;
    const pays = (profile?.pays ?? '').trim();
    if (!pays) {
      setState({
        phase: 'error',
        message: 'subscription.direct.noCountry',
      });
      return;
    }
    const res = await fetchPaymentNetworks(pays, 'renouvellement');
    if (res.kind === 'failure') {
      setState({
        phase: 'error',
        message:
          res.errorKind === 'unavailable'
            ? 'subscription.direct.unavailable'
            : 'subscription.direct.loadError',
      });
      return;
    }
    const mode = res.data.mode;
    if (mode === 'hosted') {
      setState({
        phase: 'fcfa_hosted_confirm',
        catalogue: res.data,
        message: null,
      });
      return;
    }
    if (mode === 'direct' && res.data.reseaux.length > 0) {
      setState({
        phase: 'fcfa_pick_network',
        catalogue: res.data,
        message: null,
      });
      return;
    }
    setState({
      phase: 'error',
      message: 'subscription.direct.unavailable',
      catalogue: res.data,
    });
  },

  selectNetwork(network: PaymentNetwork): void {
    setState({
      selectedNetwork: network,
      phase: 'fcfa_form',
      fieldErrors: {},
      message: null,
    });
  },

  setField(
    name: 'numeroPaiement' | 'otp' | 'email',
    value: string,
  ): void {
    const key =
      name === 'email' ? 'email' : name;
    setState({
      [key]: value,
      fieldErrors: {...state.fieldErrors, [name === 'email' ? 'emailPaiement' : name]: undefined},
    } as Partial<RenewalState>);
  },

  async submitDsi(): Promise<void> {
    if (state.submitting || trackingToken) {
      return;
    }
    setState({submitting: true, phase: 'submitting', message: null});
    const res = await renewSubscription({modePaiement: 'dsi'});
    if (res.kind === 'failure') {
      setState({
        submitting: false,
        phase: 'error',
        message:
          res.errorKind === 'unavailable'
            ? 'subscription.unavailable'
            : res.message ?? 'subscription.unexpectedResponse',
      });
      return;
    }
    if (res.status === 'active') {
      await afterSuccess(res.message ?? 'subscription.renewSuccess');
      return;
    }
    setState({
      submitting: false,
      phase: 'error',
      message: res.message ?? 'subscription.renewRefused',
    });
  },

  async submitFcfaDirect(): Promise<void> {
    if (state.submitting || trackingToken) {
      return;
    }
    const net = state.selectedNetwork;
    if (!net) {
      return;
    }
    const paiement: RenewFcfaPayment = {
      reseau: net.code,
      numeroPaiement: state.numeroPaiement.trim(),
    };
    if (net.otpRequis && state.otp.trim()) {
      paiement.otp = state.otp.trim();
    }
    if (state.email.trim()) {
      paiement.email = state.email.trim();
    }
    setState({submitting: true, phase: 'submitting', message: null});
    const res = await renewSubscription({
      modePaiement: 'fcfa',
      paiement,
    });
    await handleFcfaResponse(res);
  },

  async submitFcfaHosted(): Promise<void> {
    if (state.submitting || trackingToken) {
      return;
    }
    setState({submitting: true, phase: 'submitting', message: null});
    const res = await renewSubscription({modePaiement: 'fcfa'});
    await handleFcfaResponse(res);
  },

  async reopenHostedPayment(): Promise<void> {
    if (state.paymentUrl) {
      await openSecureBrowser(state.paymentUrl);
    }
  },

  async verifyNow(): Promise<void> {
    if (!trackingToken) {
      return;
    }
    setState({phase: 'tracking'});
    pollStartedAt = Date.now(); // reset window on manual? fiche: verify now during timeout
    ensureAppState();
    await runPoll();
  },

  /** Recommencer après timeout — avec confirmation UI côté écran */
  restartAfterTimeout(): void {
    clearPoll();
    trackingToken = null;
    clearSensitiveFields();
    setState({
      phase: 'choose_mode',
      paymentInProgress: false,
      paymentUrl: null,
      submitting: false,
      message: null,
      catalogue: null,
      selectedNetwork: null,
    });
  },

  back(): void {
    const p = state.phase;
    if (p === 'dsi_confirm' || p === 'fcfa_loading_networks' || p === 'fcfa_hosted_confirm') {
      setState({phase: 'choose_mode', message: null});
    } else if (p === 'fcfa_pick_network') {
      setState({phase: 'choose_mode', message: null, catalogue: null});
    } else if (p === 'fcfa_form') {
      setState({phase: 'fcfa_pick_network', selectedNetwork: null, fieldErrors: {}});
    }
  },
};

async function handleFcfaResponse(
  res: Awaited<ReturnType<typeof renewSubscription>>,
): Promise<void> {
  if (res.kind === 'failure') {
    setState({
      submitting: false,
      phase: 'error',
      message:
        res.errorKind === 'unavailable'
          ? 'subscription.unavailable'
          : res.message ?? 'subscription.unexpectedResponse',
    });
    return;
  }
  if (res.status === 'refuse') {
    setState({
      submitting: false,
      phase: 'error',
      message: res.message ?? 'subscription.renewRefused',
    });
    return;
  }
  if (res.status === 'active') {
    await afterSuccess(res.message ?? 'subscription.renewSuccessFcfa');
    return;
  }
  if (res.status === 'pending_payment') {
    trackingToken = res.paymentTrackingToken;
    pollStartedAt = Date.now();
    ensureAppState();
    const url = res.paymentUrl;
    if (url) {
      const ok = await openSecureBrowser(url);
      setState({
        submitting: false,
        phase: 'tracking',
        paymentInProgress: true,
        paymentUrl: ok || url ? url : null,
        message: null,
      });
    } else {
      setState({
        submitting: false,
        phase: 'tracking',
        paymentInProgress: true,
        paymentUrl: null,
        message: null,
      });
    }
    clearSensitiveFields();
    schedulePoll();
    return;
  }
  setState({
    submitting: false,
    phase: 'error',
    message: 'subscription.unexpectedResponse',
  });
}
