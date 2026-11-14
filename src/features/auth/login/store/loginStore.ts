/**
 * Store de connexion. L'écran ne parle qu'à ce store (R-LAY).
 * Le mot de passe n'est jamais conservé après l'appel.
 */

import {connecter} from '@core/api/endpoints/payment/auth.api';
import {
  registrationTracking,
  sessionStore,
} from '@core/session';
import type {PaymentMode} from '@core/session';

export type LoginStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'pendingPayment'
  | 'error';

export type PendingPaymentState = {
  userId: string;
  paymentMode: PaymentMode;
  paymentUrl: string | null;
};

type LoginState = {
  status: LoginStatus;
  error: string | null;
  pending: PendingPaymentState | null;
};

type Listener = () => void;

let state: LoginState = {
  status: 'idle',
  error: null,
  pending: null,
};

const listeners = new Set<Listener>();

function emit(): void {
  listeners.forEach(l => l());
}

function setState(partial: Partial<LoginState>): void {
  state = {...state, ...partial};
  emit();
}

export const loginStore = {
  getState(): LoginState {
    return state;
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  reset(): void {
    setState({status: 'idle', error: null, pending: null});
  },

  /**
   * Soumet la connexion. Bloque si déjà loading (pas de double envoi).
   * genericErrorMessage : clé i18n déjà résolue par l'écran.
   */
  async submit(
    identifiant: string,
    motDePasse: string,
    souvenir: boolean,
    genericErrorMessage: string,
  ): Promise<void> {
    if (state.status === 'loading') {
      return;
    }

    setState({status: 'loading', error: null, pending: null});

    const result = await connecter(identifiant, motDePasse);
    // motDePasse ne doit plus être référencé après cet appel.

    if (result.kind === 'session') {
      await sessionStore.setSession(
        {
          token: result.token,
          userId: result.userId,
          accountStatus: result.accountStatus,
          subscriptionStatus: result.subscriptionStatus,
          subscriptionActive: result.subscriptionActive,
          dateFin: result.dateFin,
          accessProof: result.accessProof,
          expiresIn: result.expiresIn,
        },
        souvenir,
      );
      setState({status: 'success', error: null, pending: null});
      return;
    }

    if (result.kind === 'pendingPayment') {
      await registrationTracking.save({
        userId: result.userId,
        paymentTrackingToken: result.paymentTrackingToken,
        paymentMode: result.paymentMode,
        paymentUrl: result.paymentUrl,
      });
      setState({
        status: 'pendingPayment',
        error: null,
        pending: {
          userId: result.userId,
          paymentMode: result.paymentMode,
          paymentUrl: result.paymentUrl,
        },
      });
      return;
    }

    setState({
      status: 'error',
      error: result.message ?? genericErrorMessage,
      pending: null,
    });
  },
};
