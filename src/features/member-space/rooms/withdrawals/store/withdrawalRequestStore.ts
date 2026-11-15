/**
 * Formulaire de demande de retrait — un seul POST à la fois.
 */

import {requestWithdrawal} from '@core/api/endpoints/payment/retraits.api';
import {fetchMoyensRetrait} from '@core/api/endpoints/payment/moyensRetrait.api';
import type {WithdrawRequestResult} from '@core/api/endpoints/payment/retraits.types';
import {memberBalanceStore} from '../../home/store/homeDashboardStore';
import {withdrawalsStore} from '@shared/store';

type Listener = () => void;

export type WithdrawalFormState = {
  pays: string;
  moyens: string[];
  moyensLoading: boolean;
  moyensError: string | null;
  moyenPaiement: string | null;
  montantDsi: string;
  numeroPaiement: string;
  submitting: boolean;
  success: Extract<
    WithdrawRequestResult,
    {status: 'demande_enregistree'}
  > | null;
  errorMessage: string | null;
  uncertain: boolean;
};

const initial: WithdrawalFormState = {
  pays: '',
  moyens: [],
  moyensLoading: false,
  moyensError: null,
  moyenPaiement: null,
  montantDsi: '',
  numeroPaiement: '',
  submitting: false,
  success: null,
  errorMessage: null,
  uncertain: false,
};

let state: WithdrawalFormState = {...initial};
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach(l => l());
}
function set(patch: Partial<WithdrawalFormState>) {
  state = {...state, ...patch};
  emit();
}

export const withdrawalRequestStore = {
  getState: () => state,
  subscribe(l: Listener) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },

  resetForm() {
    state = {
      ...initial,
      pays: state.pays,
      moyens: state.moyens,
    };
    emit();
  },

  leaveScreen() {
    state = {...initial};
    emit();
  },

  setPays(pays: string) {
    set({
      pays,
      moyenPaiement: null,
      moyens: [],
      numeroPaiement: '',
    });
  },

  setMoyen(moyen: string) {
    set({moyenPaiement: moyen, numeroPaiement: ''});
  },

  setMontant(v: string) {
    set({montantDsi: v.replace(/[^\d]/g, '')});
  },

  setNumero(v: string) {
    set({numeroPaiement: v});
  },

  async loadMoyens(pays: string): Promise<void> {
    if (!pays) return;
    set({moyensLoading: true, moyensError: null, pays});
    const res = await fetchMoyensRetrait(pays);
    if (res.kind === 'failure') {
      set({
        moyensLoading: false,
        moyens: [],
        moyensError: 'withdrawals.noMethods',
      });
      return;
    }
    set({
      moyensLoading: false,
      moyens: res.moyens,
      moyensError: res.moyens.length ? null : 'withdrawals.noMethods',
    });
  },

  async submit(): Promise<void> {
    if (state.submitting) return;
    const montant = parseInt(state.montantDsi, 10);
    const moyen = state.moyenPaiement;
    const numero = state.numeroPaiement.trim();
    if (!moyen || !numero || !Number.isFinite(montant) || montant <= 0) {
      set({errorMessage: 'withdrawals.errors.required'});
      return;
    }
    set({
      submitting: true,
      errorMessage: null,
      success: null,
      uncertain: false,
    });
    const res = await requestWithdrawal({
      montantDsi: montant,
      moyenPaiement: moyen,
      numeroPaiement: numero,
    });
    if (res.kind === 'failure') {
      if (res.errorKind === 'uncertain') {
        set({submitting: true, uncertain: true, errorMessage: null});
        await withdrawalsStore.load({force: true});
        await memberBalanceStore.load({force: true});
        set({submitting: false, uncertain: true});
        return;
      }
      set({
        submitting: false,
        errorMessage:
          res.errorKind === 'unavailable'
            ? 'withdrawals.errors.unavailable'
            : res.message ?? 'withdrawals.errors.generic',
      });
      return;
    }
    if (res.status === 'refuse') {
      set({
        submitting: false,
        errorMessage: res.message ?? 'withdrawals.errors.refused',
      });
      return;
    }
    // success
    set({
      submitting: false,
      success: res,
      numeroPaiement: '',
      montantDsi: '',
      errorMessage: null,
    });
    await withdrawalsStore.load({force: true});
    await memberBalanceStore.load({force: true});
  },
};
