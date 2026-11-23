import type {EnvelopeResult} from '@core/network';
import {
  failure,
  failureFromEnvelope,
  isRecord,
  mapPeer,
  num,
  str,
} from './common.mapper';
import type {CommunityResult} from './common.types';
import type {
  ChatMessage,
  ConversationSummary,
  ConversationType,
} from './conversations.types';

const TYPES: ConversationType[] = ['direct', 'group', 'space', 'official'];

export function mapConversationList(
  env: EnvelopeResult,
): CommunityResult<{items: ConversationSummary[]}> {
  if (!env.success) {
    return failureFromEnvelope(env);
  }
  if (!isRecord(env.data) || !Array.isArray(env.data.items)) {
    return failure('invalidResponse', env.status, 'INVALID_RESPONSE');
  }
  const items: ConversationSummary[] = [];
  for (const raw of env.data.items) {
    if (!isRecord(raw)) {
      continue;
    }
    const id = str(raw.id);
    const type = str(raw.type) as ConversationType | null;
    if (!id || !type || !TYPES.includes(type)) {
      continue;
    }
    items.push({
      id,
      type,
      title: str(raw.title) ?? '',
      spaceId: str(raw.spaceId),
      peer: mapPeer(raw.peer),
      lastMessage: str(raw.lastMessage),
      lastMessageAt: num(raw.lastMessageAt),
      createdAt: num(raw.createdAt),
    });
  }
  return {kind: 'success', items};
}

/** 201 créée ou 200 `existing` : dans les deux cas on ouvre la conversation `id`. */
export function mapCreateConversation(
  env: EnvelopeResult,
): CommunityResult<{id: string; existing: boolean}> {
  if (!env.success) {
    return failureFromEnvelope(env);
  }
  const id = isRecord(env.data) ? str(env.data.id) : null;
  if (!id) {
    return failure('invalidResponse', env.status, 'INVALID_RESPONSE');
  }
  return {
    kind: 'success',
    id,
    existing: isRecord(env.data) && env.data.existing === true,
  };
}

/** Du plus ancien au plus récent (ordre du Worker pour les discussions). */
export function sortMessages(list: ChatMessage[]): ChatMessage[] {
  return [...list].sort(
    (a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id),
  );
}

export function mapMessages(
  env: EnvelopeResult,
): CommunityResult<{items: ChatMessage[]}> {
  if (!env.success) {
    return failureFromEnvelope(env);
  }
  if (!isRecord(env.data) || !Array.isArray(env.data.items)) {
    return failure('invalidResponse', env.status, 'INVALID_RESPONSE');
  }
  const items: ChatMessage[] = [];
  for (const raw of env.data.items) {
    if (!isRecord(raw)) {
      continue;
    }
    const id = str(raw.id);
    const createdAt = num(raw.createdAt);
    if (!id || createdAt === null) {
      continue;
    }
    items.push({
      id,
      authorId: str(raw.authorId) ?? '',
      author: mapPeer(raw.author, str(raw.authorId)),
      kind: raw.type === 'file' ? 'file' : 'text',
      body: str(raw.body) ?? '',
      createdAt,
    });
  }
  return {kind: 'success', items: sortMessages(items)};
}

export function mapSentMessage(
  env: EnvelopeResult,
): CommunityResult<{id: string; createdAt: number | null}> {
  if (!env.success) {
    return failureFromEnvelope(env);
  }
  const id = isRecord(env.data) ? str(env.data.id) : null;
  if (!id) {
    return failure('invalidResponse', env.status, 'INVALID_RESPONSE');
  }
  return {
    kind: 'success',
    id,
    createdAt: isRecord(env.data) ? num(env.data.createdAt) : null,
  };
}
