/**
 * Store du navigateur d'inscription. L'écran ne parle qu'à ce store (R-LAY).
 */

import {Linking} from 'react-native';
import {registrationTracking} from '@core/session';
import {sessionStore} from '@core/session';
import {decideNavigation} from '../logic/navigationFilter';
import {
  buildDraftInjectionScript,
  buildDraftPayload,
} from '../logic/draftInjection';
import {parseRegistrationDoneMessage} from '../logic/registrationMessage';
import {resolvePrefillIdentifier} from '../logic/prefillIdentifier';
import {lastLoginIdentifier} from '../logic/lastLoginIdentifier';
import {isSiteUrl, resolveWebUrl, getSiteOriginWhitelist} from '../logic/siteUrl';

export type RegisterMode = 'new' | 'resume';

export type RegisterStatus = 'loading' | 'ready' | 'error';

type Listener = () => void;

type State = {
  status: RegisterStatus;
  mode: RegisterMode;
  startUrl: string;
  originWhitelist: string[];
  injectedScript: string | null;
  prefillIdentifiant: string;
  done: boolean;
};

const START_PATH = '/inscription?embed=app';

let state: State = {
  status: 'loading',
  mode: 'new',
  startUrl: '',
  originWhitelist: [],
  injectedScript: null,
  prefillIdentifiant: '',
  done: false,
};

const listeners = new Set<Listener>();
let draftInjectedOnce = false;
let sessionClearUnsub: (() => void) | null = null;

function emit(): void {
  listeners.forEach(l => l());
}

function setState(partial: Partial<State>): void {
  state = {...state, ...partial};
  emit();
}

function ensureSessionClearHook(): void {
  if (sessionClearUnsub) {
    return;
  }
  sessionClearUnsub = sessionStore.onSessionCleared(() => {
    lastLoginIdentifier.clear();
  });
}

export const registerBrowserStore = {
  getState(): State {
    return state;
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /**
   * Prépare l'URL de départ et l'éventuel script d'injection.
   * mode resume : lit le jeton de suivi L1a.
   */
  async prepare(mode: RegisterMode): Promise<void> {
    ensureSessionClearHook();
    draftInjectedOnce = false;
    const startUrl = resolveWebUrl(START_PATH);
    setState({
      status: 'loading',
      mode,
      startUrl,
      originWhitelist: getSiteOriginWhitelist(),
      injectedScript: null,
      done: false,
      prefillIdentifiant: '',
    });

    if (mode !== 'resume') {
      return;
    }

    const tracking = await registrationTracking.read();
    if (!tracking) {
      return;
    }
    if (!isSiteUrl(startUrl)) {
      return;
    }
    const payload = buildDraftPayload({
      userId: tracking.userId,
      paymentTrackingToken: tracking.paymentTrackingToken,
      paymentUrl: tracking.paymentUrl,
      paymentMode: tracking.paymentMode,
    });
    setState({
      injectedScript: buildDraftInjectionScript(payload),
    });
  },

  /** Script à injecter une seule fois (before content loaded). */
  consumeInjectedScript(): string | null {
    if (draftInjectedOnce) {
      return null;
    }
    if (!state.injectedScript) {
      return null;
    }
    draftInjectedOnce = true;
    return state.injectedScript;
  },

  markReady(): void {
    if (state.status !== 'ready') {
      setState({status: 'ready'});
    }
  },

  markError(): void {
    setState({status: 'error'});
  },

  retry(): void {
    setState({status: 'loading'});
  },

  /**
   * Filtre de navigation. Effets : ouverture externe via Linking si besoin.
   * @returns true = autoriser dans la WebView
   */
  handleShouldStart(url: string): boolean {
    const decision = decideNavigation(url);
    if (decision.action === 'allow') {
      return true;
    }
    if (decision.action === 'openExternal') {
      void Linking.openURL(decision.url).catch(() => {
        // Échec silencieux : pas de log d'adresse (R-SEC-5).
      });
      return false;
    }
    return false;
  },

  /**
   * Message postMessage de la WebView.
   * @returns true si parcours terminé (navigation à déclencher par l'écran)
   */
handleMessage(data: string, originUrl: string | undefined): boolean {
    const parsed = parseRegistrationDoneMessage(data, originUrl);
    if (!parsed) {
      return false;
    }
    const prefill = resolvePrefillIdentifier(parsed.identifiant);
    lastLoginIdentifier.clear();
    setState({
      done: true,
      prefillIdentifiant: prefill,
    });
    return true;
  },


  consumePrefill(): string {
    const value = state.prefillIdentifiant;
    setState({done: false, prefillIdentifiant: ''});
    return value;
  },

  /** Mémorise l'identifiant de connexion (pending_payment). */
  rememberLoginIdentifier(identifiant: string): void {
    lastLoginIdentifier.set(identifiant);
  },

  reset(): void {
    draftInjectedOnce = false;
    setState({
      status: 'loading',
      mode: 'new',
      startUrl: '',
      originWhitelist: [],
      injectedScript: null,
      prefillIdentifiant: '',
      done: false,
    });
  },
};
