import type {CommunityPeer} from './common.types';

export type ContactEntry = {
  relationId: string;
  peer: CommunityPeer;
  /** Millisecondes. */
  contactSince: number | null;
};

export type ContactRequestEntry = {
  relationId: string;
  peer: CommunityPeer;
  createdAt: number | null;
};

export type ContactRequests = {
  incoming: ContactRequestEntry[];
  outgoing: ContactRequestEntry[];
};

/** Issue d'une demande de contact (rapport §11.4) : on lit les booléens, pas le statut HTTP. */
export type RequestOutcome =
  | 'created'
  | 'duplicate'
  /** Demande croisée : l'autre avait déjà demandé, contact accepté d'office. */
  | 'cross'
  | 'alreadyContacts';
