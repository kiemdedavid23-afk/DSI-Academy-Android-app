import type {EnvelopeResult} from '@core/network';
import {failure, failureFromEnvelope, isRecord, num, str} from './common.mapper';
import type {CommunityResult} from './common.types';
import type {SupportMessage, SupportThread} from './support.types';

export function mapSupportThread(env: EnvelopeResult): CommunityResult<{thread: SupportThread}> {
  if (!env.success) {
    return failureFromEnvelope(env);
  }
  const id = isRecord(env.data) ? str(env.data.id) : null;
  if (!isRecord(env.data) || !id) {
    return failure('invalidResponse', env.status, 'INVALID_RESPONSE');
  }
  return {kind: 'success', thread: {id, created: env.data.created === true}};
}

export function mapSupportMessage(raw: unknown): SupportMessage | null {
  if (!isRecord(raw)) {
    return null;
  }
  const id = str(raw.id);
  const createdAt = num(raw.createdAt);
  if (!id || createdAt === null) {
    return null;
  }
  return {
    id,
    official: raw.official === true,
    displayName: str(raw.displayName),
    kind: raw.type === 'file' ? 'file' : 'text',
    body: str(raw.body) ?? '',
    createdAt,
    deliveredToAdminAt: num(raw.deliveredToAdminAt),
  };
}

/** Du plus ancien au plus récent (même ordre que les discussions). */
export function sortSupport(items: SupportMessage[]): SupportMessage[] {
  return [...items].sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
}

/**
 * Le Worker renvoie le fil Support du plus RÉCENT au plus ancien : ordre
 * inverse de `GET /conversations/:id/messages` (rapport §11.10). On normalise ici.
 */
export function mapSupportMessages(
  env: EnvelopeResult,
): CommunityResult<{items: SupportMessage[]}> {
  if (!env.success) {
    return failureFromEnvelope(env);
  }
  if (!isRecord(env.data) || !Array.isArray(env.data.items)) {
    return failure('invalidResponse', env.status, 'INVALID_RESPONSE');
  }
  const items = env.data.items
    .map(mapSupportMessage)
    .filter((m): m is SupportMessage => m !== null);
  return {kind: 'success', items: sortSupport(items)};
}

/** 201 `duplicate: false`, ou 200 `duplicate: true` si le même `messageId` est rejoué. */
export function mapSentSupport(
  env: EnvelopeResult,
): CommunityResult<{message: SupportMessage; duplicate: boolean}> {
  if (!env.success) {
    return failureFromEnvelope(env);
  }
  const message = isRecord(env.data) ? mapSupportMessage(env.data.message) : null;
  if (!isRecord(env.data) || !message) {
    return failure('invalidResponse', env.status, 'INVALID_RESPONSE');
  }
  return {kind: 'success', message, duplicate: env.data.duplicate === true};
}
