/**
 * Store de connexion. L'écran ne parle qu'à ce store (R-LAY).
 * Le mot de passe n'est jamais conservé après l'appel.
 * errorKind + workerMessage uniquement (pas de texte i18n dans le store).
 */

import {connecter} from '@core/api/endpoints/payment/auth.api';
import type {LoginErrorKind} from '@core/api/endpoints/payment/auth.types';
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

export type {LoginErrorKind};

type LoginState = {
  status: LoginStatus;
  errorKind: LoginErrorKind | null;
  /** Message métier du Worker (credentials / refused), sinon null. */
  workerMessage: string | null;
  pending: PendingPaymentState | null;
};

type Listener = () => void;

let state: LoginState = {
  status: 'idle',
  errorKind: null,
  workerMessage: null,
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
    setState({
      status: 'idle',
      errorKind: null,
      workerMessage: null,
      pending: null,
    });
  },

  /**
   * Soumet la connexion. Bloque si déjà loading (pas de double envoi).
   * Ne reçoit plus de texte i18n : l'écran résout selon errorKind.
   */
  async submit(
    identifiant: string,
    motDePasse: string,
    souvenir: boolean,
  ): Promise<void> {
    if (state.status === 'loading') {
      return;
    }

    setState({
      status: 'loading',
      errorKind: null,
      workerMessage: null,
      pending: null,
    });

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
      // Tracking d'inscription/paiement plus pertinent après connexion réussie.
      await registrationTracking.clear();
      setState({
        status: 'success',
        errorKind: null,
        workerMessage: null,
        pending: null,
      });
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
        errorKind: null,
        workerMessage: null,
        pending: {
          userId: result.userId,
          paymentMode: result.paymentMode,
          paymentUrl: result.paymentUrl,
        },
      });
      return;
    }

    // failure
    setState({
      status: 'error',
      errorKind: result.errorKind,
      workerMessage: result.message ?? null,
      pending: null,
    });
  },
};
