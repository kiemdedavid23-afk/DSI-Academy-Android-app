/**
 * Store notifications In-App (cloche + écran).
 * Auth Access Proof ; purge à la déconnexion (storeRegistry).
 */

import {useSyncExternalStore} from 'react';
import {
  fetchNotifications,
  fetchUnreadNotifications,
  markNotificationRead,
} from '@core/api/endpoints/notifications/notifications.api';
import type {AppNotification} from '@core/api/endpoints/notifications/notifications.types';
import {storeRegistry} from './storeRegistry';

/** Ré-export : les écrans lisent ce type ici, jamais depuis core/api (R-LAY-6). */
export type {AppNotification};

type Status = 'idle' | 'loading' | 'ready' | 'error' | 'unavailable';

type State = {
  items: AppNotification[];
  unreadCount: number;
  status: Status;
  hasMore: boolean;
  errorMessage: string | null;
};

type Listener = () => void;

const PAGE = 50;
const initial: State = {
  items: [],
  unreadCount: 0,
  status: 'idle',
  hasMore: false,
  errorMessage: null,
};

let state: State = {...initial};
const listeners = new Set<Listener>();
const markLocks = new Set<string>();

function emit() {
  listeners.forEach(l => l());
}
function set(patch: Partial<State>) {
  state = {...state, ...patch};
  emit();
}

function mergeById(
  prev: AppNotification[],
  next: AppNotification[],
): AppNotification[] {
  const map = new Map<string, AppNotification>();
  prev.forEach(n => map.set(n.id, n));
  next.forEach(n => map.set(n.id, n));
  return Array.from(map.values()).sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0,
  );
}

async function refreshUnreadCount(): Promise<void> {
  const res = await fetchUnreadNotifications();
  if (res.kind !== 'success') {
    return;
  }
  const n = res.items.length;
  // Contrat : limit 100 → afficher 99+ côté UI si n >= 100
  set({unreadCount: n});
}

export const notificationsStore = {
  getState: () => state,

  getUnreadCount(): number {
    return state.unreadCount;
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  reset(): void {
    state = {...initial};
    markLocks.clear();
    emit();
  },

  purge(): void {
    this.reset();
  },

  async refresh(): Promise<void> {
    set({
      status: state.items.length ? state.status : 'loading',
      errorMessage: null,
    });
    const res = await fetchNotifications({limit: PAGE});
    if (res.kind === 'failure') {
      if (res.errorKind === 'noProof' || res.errorKind === 'unauthorized') {
        set({
          status: 'unavailable',
          errorMessage: 'notifications.unavailable',
        });
        return;
      }
      if (res.errorKind === 'unavailable' || res.errorKind === 'network') {
        set({
          status: state.items.length ? 'ready' : 'unavailable',
          errorMessage:
            res.errorKind === 'network'
              ? 'notifications.networkError'
              : 'notifications.unavailable',
        });
        return;
      }
      set({
        status: state.items.length ? 'ready' : 'error',
        errorMessage: 'notifications.errorTitle',
      });
      return;
    }
    set({
      items: res.items,
      status: 'ready',
      hasMore: res.items.length >= PAGE,
      errorMessage: null,
    });
    await refreshUnreadCount();
  },

  async loadMore(): Promise<void> {
    if (!state.hasMore || state.status === 'loading') return;
    const last = state.items[state.items.length - 1];
    if (!last) return;
    const res = await fetchNotifications({
      limit: PAGE,
      before: last.createdAt,
    });
    if (res.kind !== 'success') return;
    const merged = mergeById(state.items, res.items);
    set({
      items: merged,
      hasMore: res.items.length >= PAGE,
    });
  },

  async markRead(id: string): Promise<void> {
    if (markLocks.has(id)) return;
    const target = state.items.find(n => n.id === id);
    if (!target || target.status === 'read') return;

    markLocks.add(id);
    const prevItems = state.items;
    const prevUnread = state.unreadCount;

    set({
      items: state.items.map(n =>
        n.id === id
          ? {...n, status: 'read', readAt: new Date().toISOString()}
          : n,
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    });

    const res = await markNotificationRead(id);
    markLocks.delete(id);

    if (res.kind === 'success') {
      set({
        items: state.items.map(n =>
          n.id === id
            ? {...n, status: 'read', readAt: res.readAt ?? n.readAt}
            : n,
        ),
      });
      await refreshUnreadCount();
      return;
    }
    if (res.errorKind === 'notFound') {
      set({
        items: state.items.filter(n => n.id !== id),
      });
      await refreshUnreadCount();
      return;
    }
    // rollback
    set({items: prevItems, unreadCount: prevUnread});
  },
};

storeRegistry.register(notificationsStore);

/** API cloche inchangée. */
export function useUnreadNotifications(): number {
  return useSyncExternalStore(
    notificationsStore.subscribe,
    notificationsStore.getUnreadCount,
    notificationsStore.getUnreadCount,
  );
}
