/**
 * Décision de démarrage (rapport §10.1) :
 * - needsProfile : seule la création du profil est possible ;
 * - subscriptionRequired : profil et photo restent modifiables, rien d'autre ;
 * - ready : périmètre social complet.
 * L'état d'abonnement vient de la session (GET /me ne le donne pas).
 */
export type CommunityGate = 'needsProfile' | 'subscriptionRequired' | 'ready';

export function communityGate(
  me: {needsProfile: boolean},
  subscriptionActive: boolean,
): CommunityGate {
  if (me.needsProfile) {
    return 'needsProfile';
  }
  return subscriptionActive ? 'ready' : 'subscriptionRequired';
}
