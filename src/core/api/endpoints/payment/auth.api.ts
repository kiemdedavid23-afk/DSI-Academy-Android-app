/**
 * Endpoint auth connexion — service payment.
 * Route publique : aucune authentification (auth: 'none').
 * Chemin relatif uniquement (R-NET).
 */

import {http} from '@core/network';
import {
  NetworkError,
  RequestAbortedError,
  TimeoutError,
} from '@core/network/errors';
import {mapAuthConnexionResponse} from './auth.mapper';
import type {AuthConnexionBody, AuthConnexionResult} from './auth.types';

const PATH = '/api/auth/connexion';

/**
 * Authentifie un membre. Ne log jamais le corps ni les jetons.
 * Distingue réseau / serveur / métier via errorKind.
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
    return mapAuthConnexionResponse(
      response.status,
      response.body,
      response.bodyKind,
    );
  } catch (err) {
    if (
      err instanceof NetworkError ||
      err instanceof TimeoutError ||
      err instanceof RequestAbortedError
    ) {
      return {kind: 'failure', errorKind: 'network'};
    }
    // Erreur inattendue côté client → server
    return {kind: 'failure', errorKind: 'server'};
  }
}
