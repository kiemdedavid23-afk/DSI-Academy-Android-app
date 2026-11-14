/**
 * Endpoint auth connexion — service payment.
 * Route publique : aucune authentification (auth: 'none').
 * Chemin relatif uniquement (R-NET).
 */

import {http} from '@core/network';
import {mapAuthConnexionResponse} from './auth.mapper';
import type {AuthConnexionBody, AuthConnexionResult} from './auth.types';

const PATH = '/api/auth/connexion';

/**
 * Authentifie un membre. Ne log jamais le corps ni les jetons.
 */
export async function connecter(
  identifiant: string,
  motDePasse: string,
): Promise<AuthConnexionResult> {
  const body: AuthConnexionBody = {identifiant, motDePasse};
  try {
    const response = await http.service('payment').post(PATH, body, {
      auth: 'none',
    });
    return mapAuthConnexionResponse(response.status, response.body);
  } catch {
    // Erreurs réseau typées → failure générique (message i18n côté store).
    return {kind: 'failure'};
  }
}
