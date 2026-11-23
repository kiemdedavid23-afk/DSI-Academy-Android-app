/**
 * Notifications internes (C6). Le Worker n'a ni compteur de non lus ni
 * « tout lire » : le non-lu est compté ici sur les 50 notifications reçues
 * (approximatif). Un type inconnu est écarté au mapper.
 */

import {listNotifications, markNotificationRead} from '@core/api/endpoints/community/notifications.api';
import type {CommunityNotification} from '@core/api/endpoints/community/notifications.types';
import {isRateLimited} from '@core/network';
import {createResourceStore, storeRegistry} from '@shared/store';
import {failureKey} from './communityErrorKeys';

const TTL_MS = 10_000;
/** Requêtes « lu » envoyées en parallèle : le Worker limite le débit par minute. */
const READ_BATCH = 5;

async function loadNotifications(): Promise<CommunityNotification[]> {
  const res = await listNotifications();
  if (res.kind !== 'success') {
    throw new Error(failureKey(res));
  }
  return res.items;
}

export const communityNotificationsStore = createResourceStore<CommunityNotification[]>({
  ttlMs: TTL_MS,
  fetcher: loadNotifications,
});

storeRegistry.register(communityNotificationsStore);

export function unreadOf(items: CommunityNotification[] | null): CommunityNotification[] {
  return (items ?? []).filter(n => !n.read);
}

/**
 * Relecture périodique (30 s au premier plan, fixée par l'écran). Pas de
 * relecture en pause de débit, ni tant que l'accès est refusé (abonnement,
 * profil) : sinon on répéterait un refus.
 */
export function refreshNotifications(): void {
  const state = communityNotificationsStore.getState();
  if (isRateLimited('community') || (state.status === 'error' && !state.data)) {
    return;
  }
  void communityNotificationsStore.load({force: true});
}

/**
 * L'état local change tout de suite, puis une requête par notification, par
 * petits lots. Jamais rejoué : si une requête échoue, la prochaine relecture
 * remet la notification en « non lue ».
 */
export async function markNotificationsRead(ids: string[]): Promise<void> {
  const unique = [...new Set(ids)].filter(Boolean);
  if (unique.length === 0) {
    return;
  }
  communityNotificationsStore.api.setState(s => ({
    data: s.data ? s.data.map(n => (unique.includes(n.id) ? {...n, read: true} : n)) : s.data,
  }));
  for (let i = 0; i < unique.length; i += READ_BATCH) {
    if (isRateLimited('community')) {
      return;
    }
    await Promise.all(unique.slice(i, i + READ_BATCH).map(id => markNotificationRead(id)));
  }
}

export function markConversationRead(conversationId: string): Promise<void> {
  const ids = unreadOf(communityNotificationsStore.getState().data)
    .filter(n => n.type === 'message.created' && n.payload.conversationId === conversationId)
    .map(n => n.id);
  return markNotificationsRead(ids);
}

export function markSupportRead(): Promise<void> {
  const ids = unreadOf(communityNotificationsStore.getState().data)
    .filter(n => n.type === 'support.message')
    .map(n => n.id);
  return markNotificationsRead(ids);
}
