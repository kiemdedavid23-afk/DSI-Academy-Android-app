/**
 * Surveillance d'expiration : AppState 'active' + minuterie plafonnée.
 * Un seul timer actif. Nettoyé à chaque fin / nouvelle session.
 * Aucun import de sessionStore (cycle cassé) : reçoit getSession + onExpire.
 */

import {AppState, type AppStateStatus, type NativeEventSubscription} from 'react-native';

/** Plafond setTimeout (évite débordement ~24,8 j). */
const MAX_TIMEOUT_MS = 2_147_483_647;

type SessionLike = {
  expiresAt: number;
};

type WatchDeps = {
  getSession: () => SessionLike | null;
  onExpire: (reason: 'expired') => void;
};

let timer: ReturnType<typeof setTimeout> | null = null;
let appSub: NativeEventSubscription | null = null;
let started = false;
let deps: WatchDeps | null = null;

function clearTimer(): void {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
}

function scheduleFromSession(): void {
  clearTimer();
  if (!deps) {
    return;
  }
  const session = deps.getSession();
  if (!session) {
    return;
  }
  const delay = session.expiresAt - Date.now();
  if (delay <= 0) {
    deps.onExpire('expired');
    return;
  }
  const capped = Math.min(delay, MAX_TIMEOUT_MS);
  timer = setTimeout(() => {
    timer = null;
    if (!deps) {
      return;
    }
    const current = deps.getSession();
    if (current && current.expiresAt <= Date.now()) {
      deps.onExpire('expired');
    } else {
      scheduleFromSession();
    }
  }, capped);
}

function onAppState(next: AppStateStatus): void {
  if (next !== 'active') {
    return;
  }
  if (!deps) {
    return;
  }
  const session = deps.getSession();
  if (!session) {
    return;
  }
  if (session.expiresAt <= Date.now()) {
    deps.onExpire('expired');
    return;
  }
  scheduleFromSession();
}

export const sessionExpiryWatch = {
  /**
   * Démarre le watch une fois. Injection totale : pas d'import sessionStore.
   */
  start(options: WatchDeps): void {
    deps = options;
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
    deps = null;
  },
};
