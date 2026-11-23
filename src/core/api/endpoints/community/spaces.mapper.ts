import type {EnvelopeResult} from '@core/network';
import {
  failure,
  failureFromEnvelope,
  isRecord,
  mapWriteOk,
  num,
  str,
} from './common.mapper';
import type {CommunityResult, CommunityWriteResult} from './common.types';
import type {
  CreatedSpace,
  JoinedSpace,
  SpaceDetail,
  SpaceSummary,
} from './spaces.types';

function mapSummary(raw: unknown): SpaceSummary | null {
  if (!isRecord(raw)) {
    return null;
  }
  const id = str(raw.id);
  const name = str(raw.name);
  if (!id || name === null) {
    return null;
  }
  return {
    id,
    name,
    description: str(raw.description) ?? '',
    ownerId: str(raw.ownerId) ?? '',
    memberCount: num(raw.memberCount) ?? 0,
    joined: raw.joined === true,
    createdAt: num(raw.createdAt),
  };
}

export function mapSpaceList(
  env: EnvelopeResult,
): CommunityResult<{items: SpaceSummary[]}> {
  if (!env.success) {
    return failureFromEnvelope(env);
  }
  if (!isRecord(env.data) || !Array.isArray(env.data.items)) {
    return failure('invalidResponse', env.status, 'INVALID_RESPONSE');
  }
  const items: SpaceSummary[] = [];
  for (const raw of env.data.items) {
    const item = mapSummary(raw);
    if (item) {
      items.push(item);
    }
  }
  return {kind: 'success', items};
}

/** Le détail est l'objet espace lui-même (`data`), pas une enveloppe `{space}`. */
export function mapSpaceDetail(
  env: EnvelopeResult,
): CommunityResult<{space: SpaceDetail}> {
  if (!env.success) {
    return failureFromEnvelope(env);
  }
  const base = mapSummary(env.data);
  if (!base || !isRecord(env.data)) {
    return failure('invalidResponse', env.status, 'INVALID_RESPONSE');
  }
  return {
    kind: 'success',
    space: {
      ...base,
      visibility: env.data.visibility === 'private' ? 'private' : 'public',
      conversationId: str(env.data.conversationId),
    },
  };
}

export function mapCreatedSpace(
  env: EnvelopeResult,
): CommunityResult<CreatedSpace> {
  if (!env.success) {
    return failureFromEnvelope(env);
  }
  const id = isRecord(env.data) ? str(env.data.id) : null;
  if (!id || !isRecord(env.data)) {
    return failure('invalidResponse', env.status, 'INVALID_RESPONSE');
  }
  return {kind: 'success', id, conversationId: str(env.data.conversationId)};
}

export function mapJoinedSpace(
  env: EnvelopeResult,
): CommunityResult<JoinedSpace> {
  if (!env.success) {
    return failureFromEnvelope(env);
  }
  if (!isRecord(env.data) || env.data.joined !== true) {
    return failure('invalidResponse', env.status, 'INVALID_RESPONSE');
  }
  return {
    kind: 'success',
    conversationId: str(env.data.conversationId),
    already: env.data.already === true,
  };
}

/** Quitter est idempotent : seul le succès compte. */
export function mapLeftSpace(env: EnvelopeResult): CommunityWriteResult {
  return mapWriteOk(env);
}
