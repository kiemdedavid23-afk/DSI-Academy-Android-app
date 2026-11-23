import type {EnvelopeResult} from '@core/network';
import {failure, failureFromEnvelope, isRecord, num, str} from './common.mapper';
import type {CommunityResult} from './common.types';
import type {CommunityNotification, NotificationType} from './notifications.types';

const TYPES: NotificationType[] = ['message.created', 'call.incoming', 'support.message'];

/**
 * Un type inconnu (`space.joined`, `internal`, futurs types) est écarté sans
 * erreur (rapport §11.8). Les valeurs de `payload` non textuelles sont ignorées.
 */
export function mapNotifications(
  env: EnvelopeResult,
): CommunityResult<{items: CommunityNotification[]}> {
  if (!env.success) {
    return failureFromEnvelope(env);
  }
  if (!isRecord(env.data) || !Array.isArray(env.data.items)) {
    return failure('invalidResponse', env.status, 'INVALID_RESPONSE');
  }
  const items: CommunityNotification[] = [];
  for (const raw of env.data.items) {
    if (!isRecord(raw)) {
      continue;
    }
    const id = str(raw.id);
    const type = str(raw.type) as NotificationType | null;
    const createdAt = num(raw.createdAt);
    if (!id || !type || !TYPES.includes(type) || createdAt === null) {
      continue;
    }
    const payload: Record<string, string> = {};
    if (isRecord(raw.payload)) {
      for (const [k, v] of Object.entries(raw.payload)) {
        if (typeof v === 'string') {
          payload[k] = v;
        }
      }
    }
    items.push({
      id,
      type,
      payload,
      fromDisplayName: (str(raw.fromDisplayName) ?? '').trim(),
      fromPseudonym: (str(raw.fromPseudonym) ?? '').trim(),
      read: raw.read === true,
      createdAt,
    });
  }
  items.sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id));
  return {kind: 'success', items};
}
