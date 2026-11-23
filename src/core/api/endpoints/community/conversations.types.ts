import type {CommunityPeer} from './common.types';

/** `official` = fil Support DSI (lot C6) ; `space` = conversation d'un espace (lot C5). */
export type ConversationType = 'direct' | 'group' | 'space' | 'official';

export type ConversationSummary = {
  id: string;
  type: ConversationType;
  /** Discussion privée : nom affiché du pair ; sinon titre de la conversation. */
  title: string;
  spaceId: string | null;
  /** Renseigné pour `direct` seulement. */
  peer: CommunityPeer | null;
  /** `null` : aucun message, ou message n'ayant qu'une pièce jointe. */
  lastMessage: string | null;
  /** Millisecondes. */
  lastMessageAt: number | null;
  createdAt: number | null;
};

export type ChatMessage = {
  id: string;
  authorId: string;
  /** `null` si l'auteur n'existe plus. */
  author: CommunityPeer | null;
  /** `file` : message n'ayant qu'une pièce jointe (affichée comme telle, jamais ouverte : lot hors périmètre). */
  kind: 'text' | 'file';
  body: string;
  /** Millisecondes. */
  createdAt: number;
};

export type MessagesQuery = {limit?: number; before?: number};
