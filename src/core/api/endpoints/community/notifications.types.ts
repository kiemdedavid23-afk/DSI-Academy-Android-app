/** Notifications internes (rapport §11.8). Pas de compteur de non lus côté Worker. */

export type NotificationType = 'message.created' | 'call.incoming' | 'support.message';

export type CommunityNotification = {
  id: string;
  type: NotificationType;
  /** Valeurs en chaînes (120 caractères au plus) : conversationId, messageId, from, callId… */
  payload: Record<string, string>;
  fromDisplayName: string;
  fromPseudonym: string;
  read: boolean;
  /** Millisecondes. */
  createdAt: number;
};
