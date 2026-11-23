import type {EnvelopeResult} from '@core/network';
import {
  failure,
  failureFromEnvelope,
  isRecord,
  mapPeer,
  str,
} from './common.mapper';
import type {CommunityPeer, CommunityResult} from './common.types';
import type {ContactStatus, MemberCard} from './directory.types';

const STATUSES: ContactStatus[] = [
  'NONE',
  'PENDING_OUTGOING',
  'PENDING_INCOMING',
  'ACCEPTED',
];

/** GET /members/search : 0 ou 1 résultat ; le membre peut se trouver lui-même. */
export function mapMemberSearch(
  env: EnvelopeResult,
): CommunityResult<{items: CommunityPeer[]}> {
  if (!env.success) {
    return failureFromEnvelope(env);
  }
  if (!isRecord(env.data) || !Array.isArray(env.data.items)) {
    return failure('invalidResponse', env.status, 'INVALID_RESPONSE');
  }
  const items = env.data.items
    .map(item => mapPeer(item))
    .filter((p): p is CommunityPeer => p !== null);
  return {kind: 'success', items};
}

/** GET /members/:ref. */
export function mapMemberCard(
  env: EnvelopeResult,
): CommunityResult<{card: MemberCard}> {
  if (!env.success) {
    return failureFromEnvelope(env);
  }
  const data = env.data;
  const member = isRecord(data) ? mapPeer(data.profile) : null;
  if (!isRecord(data) || !member) {
    return failure('invalidResponse', env.status, 'INVALID_RESPONSE');
  }
  const self = data.self === true;
  let contact: MemberCard['contact'] = null;
  if (!self && isRecord(data.contact)) {
    const status = str(data.contact.status) as ContactStatus | null;
    contact = {
      status: status && STATUSES.includes(status) ? status : 'NONE',
      relationId: str(data.contact.relationId),
    };
  }
  const blockedByMe = !self && isRecord(data.blocked) && data.blocked.byMe === true;
  return {kind: 'success', card: {member, self, contact, blockedByMe}};
}
