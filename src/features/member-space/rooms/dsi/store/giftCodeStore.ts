/**
 * Code cadeau — état de la fenêtre + appel API (R-LAY-5/6 : l'écran n'importe
 * pas @core/api, il lit ce store et déclenche ses actions).
 *
 * Contrat Paiement §2.7 : un refus est un message unique qui ne révèle pas la
 * raison. Le message serveur est affiché tel quel ; l'app n'en déduit rien.
 */

import {redeemGiftCode} from '@core/api/endpoints/payment/codeCadeau.api';
import {memberBalanceStore} from '../../home/store/homeDashboardStore';

type Listener = () => void;

export type GiftCodeState = {
  submitting: boolean;
  /** Clé i18n d'une erreur locale (code vide, service indisponible, trop d'essais). */
  errorKey: string | null;
  /** Message serveur, affiché tel quel (refus du code). */
  errorMessage: string | null;
  successAmount: number | null;
};

const initial: GiftCodeState = {
  submitting: false,
  errorKey: null,
  errorMessage: null,
  successAmount: null,
};

let state: GiftCodeState = {...initial};
const listeners = new Set<Listener>();

function set(patch: Partial<GiftCodeState>): void {
  state = {...state, ...patch};
  listeners.forEach(l => l());
}

export const giftCodeStore = {
  getState: (): GiftCodeState => state,

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /** Remet la fenêtre à zéro (ouverture / fermeture). */
  reset(): void {
    set({...initial});
  },

  async submit(code: string): Promise<void> {
    if (state.submitting || state.successAmount != null) {
      return;
    }
    const valeur = code.trim();
    if (!valeur) {
      set({errorKey: 'dsi.gift.errors.empty', errorMessage: null});
      return;
    }
    set({submitting: true, errorKey: null, errorMessage: null});
    const res = await redeemGiftCode(valeur);
    if (res.kind === 'failure') {
      set({
        submitting: false,
        errorMessage: null,
        errorKey:
          res.errorKind === 'tooMany'
            ? 'dsi.gift.tooManyAttempts'
            : res.reason === 'empty'
              ? 'dsi.gift.errors.empty'
              : 'dsi.gift.errors.unavailable',
      });
      return;
    }
    if (res.status === 'refuse') {
      set({
        submitting: false,
        errorMessage: res.message,
        errorKey: res.message ? null : 'dsi.gift.errors.invalid',
      });
      return;
    }
    set({submitting: false, successAmount: res.montantDsi});
    void memberBalanceStore.load({force: true});
  },
};
