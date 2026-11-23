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
  ContactEntry,
  ContactRequestEntry,
  ContactRequests,
  RequestOutcome,
} from './contacts.types';

export function mapContactsList(
  env: EnvelopeResult,
): CommunityResult<{items: ContactEntry[]}> {
  if (!env.success) {
    return failureFromEnvelope(env);
  }
  if (!isRecord(env.data) || !Array.isArray(env.data.items)) {
    return failure('invalidResponse', env.status, 'INVALID_RESPONSE');
  }
  const items: ContactEntry[] = [];
  for (const raw of env.data.items) {
    const peer = mapPeer(raw);
    const relationId = isRecord(raw) ? str(raw.relationId) : null;
    if (peer && relationId) {
      items.push({relationId, peer, contactSince: isRecord(raw) ? num(raw.contactSince) : null});
    }
  }
  return {kind: 'success', items};
}

function mapRequestList(raw: unknown): ContactRequestEntry[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: ContactRequestEntry[] = [];
  for (const item of raw) {
    if (!isRecord(item)) {
      continue;
    }
    const relationId = str(item.id);
    const peer = mapPeer(item.peer, str(item.peerId));
    if (relationId && peer) {
      out.push({relationId, peer, createdAt: num(item.createdAt)});
    }
  }
  return out;
}

export function mapContactRequests(
  env: EnvelopeResult,
): CommunityResult<{requests: ContactRequests}> {
  if (!env.success) {
    return failureFromEnvelope(env);
  }
  if (!isRecord(env.data)) {
    return failure('invalidResponse', env.status, 'INVALID_RESPONSE');
  }
  return {
    kind: 'success',
    requests: {
      incoming: mapRequestList(env.data.incoming),
      outgoing: mapRequestList(env.data.outgoing),
    },
  };
}

/** POST /contacts/request : quatre cas distincts (rapport §11.4). */
export function mapRequestOutcome(
  env: EnvelopeResult,
): CommunityResult<{outcome: RequestOutcome}> {
  if (!env.success) {
    return failureFromEnvelope(env);
  }
  const d = isRecord(env.data) ? env.data : {};
  let outcome: RequestOutcome = 'created';
  if (d.alreadyContacts === true) {
    outcome = 'alreadyContacts';
  } else if (d.cross === true || d.accepted === true) {
    outcome = 'cross';
  } else if (d.duplicate === true) {
    outcome = 'duplicate';
  }
  return {kind: 'success', outcome};
}
