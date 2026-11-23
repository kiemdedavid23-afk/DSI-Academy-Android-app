import {safeEnvelope} from '@core/network';
import {community, noProof} from './common.api';
import {mapWriteOk} from './common.mapper';
import {
  mapContactRequests,
  mapContactsList,
  mapRequestOutcome,
} from './contacts.mapper';

/**
 * Contacts et blocage (rapport §11.4) : abonnement actif requis ; demande,
 * blocage et déblocage partagent le seau de débit `contact` (20 par minute).
 * Aucune écriture n'est rejouée automatiquement.
 */

const AUTH = {auth: 'accessProof'} as const;
const base = '/api/community/contacts';

export async function fetchContacts() {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  return mapContactsList(await safeEnvelope(community().get(base, AUTH)));
}

export async function fetchContactRequests() {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  return mapContactRequests(
    await safeEnvelope(community().get(`${base}/requests`, AUTH)),
  );
}

/** `userId` : identifiant DSI du membre ciblé. */
export async function requestContact(userId: string) {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  return mapRequestOutcome(
    await safeEnvelope(community().post(`${base}/request`, {userId}, AUTH)),
  );
}

const relation = (relationId: string) => encodeURIComponent(relationId);

export async function acceptContactRequest(relationId: string) {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  return mapWriteOk(
    await safeEnvelope(
      community().post(`${base}/requests/${relation(relationId)}/accept`, undefined, AUTH),
    ),
  );
}

export async function rejectContactRequest(relationId: string) {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  return mapWriteOk(
    await safeEnvelope(
      community().post(`${base}/requests/${relation(relationId)}/reject`, undefined, AUTH),
    ),
  );
}

export async function cancelContactRequest(relationId: string) {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  return mapWriteOk(
    await safeEnvelope(
      community().delete(`${base}/requests/${relation(relationId)}`, AUTH),
    ),
  );
}

/** Retire un contact accepté ; la discussion existante reste lisible. */
export async function removeContact(ref: string) {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  return mapWriteOk(
    await safeEnvelope(
      community().delete(`${base}/${encodeURIComponent(ref)}`, AUTH),
    ),
  );
}

export async function blockMember(peerId: string) {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  return mapWriteOk(
    await safeEnvelope(community().post(`${base}/block`, {peerId}, AUTH)),
  );
}

export async function unblockMember(peerId: string) {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  return mapWriteOk(
    await safeEnvelope(community().post(`${base}/unblock`, {peerId}, AUTH)),
  );
}
