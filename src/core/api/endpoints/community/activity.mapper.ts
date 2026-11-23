import type {EnvelopeResult} from '@core/network';
import {failure, failureFromEnvelope, isRecord, num, str} from './common.mapper';
import type {CommunityResult} from './common.types';
import type {ActivityEvent, ActivityType} from './activity.types';

const TYPES: ActivityType[] = ['space.created', 'space.joined'];

/**
 * Le `text` du serveur (français) est volontairement ignoré : la phrase est
 * fabriquée dans l'app à partir de `type` et de l'acteur (rapport §11.7, §15 n°14).
 * Un type inconnu est écarté : sans texte serveur, aucune phrase n'est possible.
 */
export function mapActivity(
  env: EnvelopeResult,
): CommunityResult<{items: ActivityEvent[]}> {
  if (!env.success) {
    return failureFromEnvelope(env);
  }
  if (!isRecord(env.data) || !Array.isArray(env.data.items)) {
    return failure('invalidResponse', env.status, 'INVALID_RESPONSE');
  }
  const items: ActivityEvent[] = [];
  for (const raw of env.data.items) {
    if (!isRecord(raw)) {
      continue;
    }
    const id = str(raw.id);
    const type = str(raw.type) as ActivityType | null;
    const createdAt = num(raw.createdAt);
    if (!id || !type || !TYPES.includes(type) || createdAt === null) {
      continue;
    }
    items.push({
      id,
      type,
      actorId: str(raw.actorId) ?? '',
      actorDisplayName: (str(raw.actorDisplayName) ?? '').trim(),
      actorPseudonym: (str(raw.actorPseudonym) ?? '').trim(),
      createdAt,
    });
  }
  // Du plus récent au plus ancien, comme le Worker.
  items.sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id));
  return {kind: 'success', items};
}
