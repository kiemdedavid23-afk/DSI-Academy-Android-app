/** Support DSI : fil officiel unique par membre (rapport §11.10). */

export type SupportThread = {
  id: string;
  /** `true` au tout premier accès (le fil vient d'être créé). */
  created: boolean;
};

export type SupportMessage = {
  id: string;
  /** `true` : réponse de l'équipe DSI ; `false` : mon message. */
  official: boolean;
  /** « Support DSI » pour l'équipe, `null` pour mes messages. */
  displayName: string | null;
  /** `file` : message n'ayant qu'une pièce jointe (jamais ouverte : Service Fichiers non livré). */
  kind: 'text' | 'file';
  body: string;
  /** Millisecondes. */
  createdAt: number;
  /** Millisecondes ; `null` tant que l'équipe n'a pas reçu le message. */
  deliveredToAdminAt: number | null;
};

export type SupportQuery = {limit?: number; before?: number};
