/**
 * Choix de l'identifiant à préremplir après inscription.
 * a) message valide (non DSI-) ; b) dernier identifiant connexion ; c) vide.
 */

import {lastLoginIdentifier} from './lastLoginIdentifier';

function isDsiId(value: string): boolean {
  return value.toUpperCase().startsWith('DSI-');
}

export function resolvePrefillIdentifier(
  messageIdentifiant: string | null | undefined,
): string {
  if (
    typeof messageIdentifiant === 'string' &&
    messageIdentifiant.trim().length > 0 &&
    messageIdentifiant.trim().length <= 254 &&
    !isDsiId(messageIdentifiant.trim())
  ) {
    return messageIdentifiant.trim();
  }
  return lastLoginIdentifier.get() ?? '';
}
