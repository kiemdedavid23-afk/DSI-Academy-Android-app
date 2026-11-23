import {http} from '@core/network';
import {sessionStore} from '@core/session';
import {failure} from './common.mapper';
import type {CommunityFailure} from './common.types';

/**
 * Worker Communauté : aucune route publique. `X-Access-Proof` sur tous les
 * appels (mode par défaut du service, R-NET-8). Jamais de route /internal/.
 */
export const community = () => http.service('community');

/** Échec local, sans appel réseau, si le membre n'a pas de preuve d'accès. */
export function noProof(): CommunityFailure | null {
  return sessionStore.getAccessProof() ? null : failure('noProof', null);
}
