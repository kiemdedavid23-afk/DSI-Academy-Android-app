import {safeEnvelope} from '@core/network';
import {community, noProof} from './common.api';
import {
  mapConversationList,
  mapCreateConversation,
  mapMessages,
  mapSentMessage,
} from './conversations.mapper';
import type {MessagesQuery} from './conversations.types';

/**
 * Discussions privées et groupes (rapport §11.5). Abonnement actif requis.
 * Envoi : seau `message` (30 par minute) ; création : seau `create` (10).
 * L'envoi n'est jamais rejoué automatiquement : il n'est pas idempotent
 * (rapport §8.3), on relit d'abord l'état.
 */

const AUTH = {auth: 'accessProof'} as const;
const base = '/api/community/conversations';

export const MESSAGE_MAX_LENGTH = 4000;

export async function listConversations() {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  return mapConversationList(await safeEnvelope(community().get(base, AUTH)));
}

/** Une seule discussion par paire : le Worker renvoie l'existante (`existing`). */
export async function createDirectConversation(memberId: string) {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  return mapCreateConversation(
    await safeEnvelope(
      community().post(base, {type: 'direct', memberIds: [memberId]}, AUTH),
    ),
  );
}

export async function createGroupConversation(title: string, memberIds: string[]) {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  const body: Record<string, unknown> = {type: 'group', memberIds};
  if (title) {
    body.title = title;
  }
  return mapCreateConversation(
    await safeEnvelope(community().post(base, body, AUTH)),
  );
}

/** Sans `before` : dernière page. `before` : horodatage du plus ancien message affiché. */
export async function fetchMessages(conversationId: string, q: MessagesQuery = {}) {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  return mapMessages(
    await safeEnvelope(
      community().get(`${base}/${encodeURIComponent(conversationId)}/messages`, {
        ...AUTH,
        query: {limit: q.limit, before: q.before},
      }),
    ),
  );
}

export async function sendMessage(conversationId: string, text: string) {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  return mapSentMessage(
    await safeEnvelope(
      community().post(
        `${base}/${encodeURIComponent(conversationId)}/messages`,
        {text},
        AUTH,
      ),
    ),
  );
}
