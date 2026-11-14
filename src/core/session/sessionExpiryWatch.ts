/**
 * Surveillance d'expiration : AppState 'active' + minuterie plafonnée.
 * Un seul timer actif. Nettoyé à chaque fin / nouvelle session.
 */

import {AppState, type AppStateStatus, type NativeEventSubscription} from 'react-native';
import {sessionStore} from './sessionStore';

/** Plafond setTimeout (évite débordement ~24,8 j). */
const MAX_TIMEOUT_MS = 2_147_483_647;

let timer: ReturnType<typeof setTimeout> | null = null;
let appSub: NativeEventSubscription | null = null;
let started = false;
let expireFn: ((reason: 'expired') => void) | null = null;

function clearTimer(): void {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
}

function scheduleFromSession(): void {
  clearTimer();
  const session = sessionStore.getSession();
  if (!session) {
    return;
  }
  const delay = session.expiresAt - Date.now();
  if (delay <= 0) {
    expireFn?.('expired');
    return;
  }
  const capped = Math.min(delay, MAX_TIMEOUT_MS);
  timer = setTimeout(() => {
    timer = null;
    const current = sessionStore.getSession();
    if (current && current.expiresAt <= Date.now()) {
      expireFn?.('expired');
    } else {
      scheduleFromSession();
    }
  }, capped);
}

function onAppState(next: AppStateStatus): void {
  if (next !== 'active') {
    return;
  }
  const session = sessionStore.getSession();
  if (!session) {
    return;
  }
  if (session.expiresAt <= Date.now()) {
    expireFn?.('expired');
    return;
  }
  scheduleFromSession();
}

export const sessionExpiryWatch = {
  /**
   * Démarre le watch une fois. `expire` = sessionStore.expireSession branché.
   */
  start(expire: (reason: 'expired') => void): void {
    expireFn = expire;
    if (started) {
      scheduleFromSession();
      return;
    }
    started = true;
    appSub = AppState.addEventListener('change', onAppState);
    scheduleFromSession();
  },

  /** À appeler après setSession / clear. */
  reschedule(): void {
    scheduleFromSession();
  },

  stop(): void {
    clearTimer();
    appSub?.remove();
    appSub = null;
    started = false;
    expireFn = null;
  },
};
