import type {CommunityPeer} from './common.types';

export type ContactStatus =
  | 'NONE'
  | 'PENDING_OUTGOING'
  | 'PENDING_INCOMING'
  | 'ACCEPTED';

/**
 * Fiche d'un membre (rapport §11.3). `blocked.byThem` est volontairement absent :
 * l'afficher révélerait un blocage que le Worker présente ailleurs par un
 * message neutre (décision D7). Seul `byMe` est conservé.
 */
export type MemberCard = {
  member: CommunityPeer;
  self: boolean;
  contact: {status: ContactStatus; relationId: string | null} | null;
  blockedByMe: boolean;
};
