import {safeEnvelope} from '@core/network';
import {mapWriteOk} from './common.mapper';
import {community, noProof} from './common.api';
import {mapNotifications} from './notifications.mapper';

/**
 * Rapport §11.8. Abonnement actif requis. 50 dernières notifications, sans
 * paramètre. Pas de « tout marquer comme lu » : une requête par notification.
 */
const AUTH = {auth: 'accessProof'} as const;

export async function listNotifications() {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  return mapNotifications(
    await safeEnvelope(community().get('/api/community/notifications', AUTH)),
  );
}

/** Répond toujours 200, même pour un identifiant inconnu : ce n'est pas une confirmation. */
export async function markNotificationRead(id: string) {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  return mapWriteOk(
    await safeEnvelope(
      community().post(
        `/api/community/notifications/${encodeURIComponent(id)}/read`,
        undefined,
        AUTH,
      ),
    ),
  );
}
