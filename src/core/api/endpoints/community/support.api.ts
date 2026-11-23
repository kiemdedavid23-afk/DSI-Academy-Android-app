import {safeEnvelope} from '@core/network';
import {community, noProof} from './common.api';
import {mapSentSupport, mapSupportMessages, mapSupportThread} from './support.mapper';
import type {SupportQuery} from './support.types';

/**
 * Support DSI (rapport §11.10). Abonnement actif requis. Envoi : seau `message`.
 * Écrire au Support passe TOUJOURS par POST /support/messages, jamais par
 * POST /conversations/:id/messages (le message n'arriverait pas à l'équipe).
 */
const AUTH = {auth: 'accessProof'} as const;
const base = '/api/community/support';

export const SUPPORT_MESSAGE_MAX_LENGTH = 4000;
export const SUPPORT_MESSAGE_ID_MAX_LENGTH = 64;

/** Crée le fil au premier appel (201), puis le renvoie (200). */
export async function openSupport() {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  return mapSupportThread(await safeEnvelope(community().get(base, AUTH)));
}

export async function fetchSupportMessages(q: SupportQuery = {}) {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  return mapSupportMessages(
    await safeEnvelope(
      community().get(`${base}/messages`, {...AUTH, query: {limit: q.limit, before: q.before}}),
    ),
  );
}

/**
 * `messageId` est généré par l'app : le renvoyer après un délai dépassé ne
 * crée pas de doublon. C'est la seule écriture rejouable (rapport §8.3).
 * Clé `body` uniquement (pas `text`).
 */
export async function sendSupportMessage(messageId: string, body: string) {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  return mapSentSupport(
    await safeEnvelope(community().post(`${base}/messages`, {body, messageId}, AUTH)),
  );
}
