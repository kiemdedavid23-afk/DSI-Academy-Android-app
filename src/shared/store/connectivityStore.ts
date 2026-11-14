/**
 * État réseau via @react-native-community/netinfo 12.0.1.
 * Anti-clignotement ~1,5 s avant d'annoncer hors-ligne.
 * Pas d'annonce au démarrage si déjà en ligne.
 * isInternetReachable pris en compte.
 */

import NetInfo, {type NetInfoState} from '@react-native-community/netinfo';
import {bannerStore} from './bannerStore';
import {i18n} from '@shared/i18n';

export type ConnectivityStatus = 'online' | 'offline' | 'unknown';

type Listener = () => void;

const OFFLINE_DEBOUNCE_MS = 1500;
const RECONNECTED_HIDE_MS = 3000;

let status: ConnectivityStatus = 'unknown';
let ready = false; // true après première lecture NetInfo
let offlineTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectedTimer: ReturnType<typeof setTimeout> | null = null;
let unsubNet: (() => void) | null = null;
let started = false;
const listeners = new Set<Listener>();
const onOnlineCallbacks = new Set<() => void>();

function emit(): void {
  listeners.forEach(l => l());
}

function t(key: string, fallback: string): string {
  try {
    return i18n.t(key, {defaultValue: fallback});
  } catch {
    return fallback;
  }
}

function isReachable(state: NetInfoState): boolean {
  if (state.isConnected === false) {
    return false;
  }
  // null = unknown on some platforms → treat as online if connected
  if (state.isInternetReachable === false) {
    return false;
  }
  return state.isConnected === true;
}

function announceOffline(): void {
  if (status === 'offline') {
    return;
  }
  status = 'offline';
  emit();
  bannerStore.show({
    type: 'connectivity-offline',
    tone: 'warning',
    title: t('app.connectivity.offlineTitle', 'Vous êtes hors connexion'),
    message: t(
      'app.connectivity.offlineMessage',
      'Les dernières données enregistrées sont affichées.',
    ),
    dismissible: false,
  });
}

function announceOnline(fromOffline: boolean): void {
  status = 'online';
  emit();
  // dismiss offline banner
  const cur = bannerStore.get();
  if (cur?.type === 'connectivity-offline') {
    bannerStore.dismiss(cur.id);
  }
  if (fromOffline) {
    bannerStore.show({
      type: 'connectivity-online',
      tone: 'success',
      title: t('app.connectivity.onlineTitle', 'Connexion rétablie'),
      message: t(
        'app.connectivity.onlineMessage',
        'Mise à jour des données en cours…',
      ),
      dismissible: true,
      autoHideMs: RECONNECTED_HIDE_MS,
    });
    onOnlineCallbacks.forEach(cb => {
      try {
        cb();
      } catch {
        /* ignore */
      }
    });
  }
}

function handleState(state: NetInfoState): void {
  const reachable = isReachable(state);

  if (!ready) {
    ready = true;
    status = reachable ? 'online' : 'offline';
    emit();
    // Pas d'annonce au démarrage si déjà en ligne
    if (!reachable) {
      announceOffline();
    }
    return;
  }

  if (!reachable) {
    if (offlineTimer) {
      return;
    }
    offlineTimer = setTimeout(() => {
      offlineTimer = null;
      announceOffline();
    }, OFFLINE_DEBOUNCE_MS);
  } else {
    if (offlineTimer) {
      clearTimeout(offlineTimer);
      offlineTimer = null;
    }
    const wasOffline = status === 'offline';
    announceOnline(wasOffline);
  }
}

export const connectivityStore = {
  getStatus(): ConnectivityStatus {
    return status;
  },

  isOnline(): boolean {
    return status === 'online';
  },

  /** Démarre l'écoute NetInfo (idempotent). À appeler une fois depuis la coquille. */
  start(): void {
    if (started) {
      return;
    }
    started = true;
    NetInfo.fetch()
      .then(handleState)
      .catch(() => {
        ready = true;
        status = 'unknown';
        emit();
      });
    unsubNet = NetInfo.addEventListener(handleState);
  },

  stop(): void {
    if (unsubNet) {
      unsubNet();
      unsubNet = null;
    }
    if (offlineTimer) {
      clearTimeout(offlineTimer);
      offlineTimer = null;
    }
    if (reconnectedTimer) {
      clearTimeout(reconnectedTimer);
      reconnectedTimer = null;
    }
    started = false;
  },

  /** Callback au retour en ligne (rechargement stores visibles). */
  onReconnected(cb: () => void): () => void {
    onOnlineCallbacks.add(cb);
    return () => {
      onOnlineCallbacks.delete(cb);
    };
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /** Tests uniquement */
  _resetForTests(): void {
    this.stop();
    status = 'unknown';
    ready = false;
    bannerStore.dismiss();
  },
};
