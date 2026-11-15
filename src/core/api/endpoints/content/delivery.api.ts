import {http} from '@core/network';
import {sessionStore} from '@core/session';
import {catchNet} from './common.api';
import {failure} from './common.mapper';
import {mapDelivery} from './delivery.mapper';
import type {DeliveryResult} from './delivery.types';

/**
 * GET /content/:id/deliver — seule route du Worker Contenu qui exige la preuve
 * d'accès (X-Access-Proof). Lecture uniquement : l'app lit en direct chez la
 * source, aucun téléchargement (intent=download n'est jamais envoyé).
 * Pour une formation, appeler avec l'id du module enfant, jamais celui de la
 * formation (elle n'a pas d'asset propre).
 */
export async function fetchDeliveryLink(
  contentId: number,
): Promise<DeliveryResult> {
  if (!Number.isInteger(contentId) || contentId <= 0) {
    return failure('validation', null, 'INVALID_ID');
  }
  if (!sessionStore.getAccessProof()) {
    return failure('noProof', null, 'ACCESS_PROOF_MISSING');
  }
  try {
    const response = await http
      .service('content')
      .get(`/content/${contentId}/deliver`, {auth: 'accessProof'});
    return mapDelivery(response.status, response.body, response.bodyKind);
  } catch (err) {
    return catchNet(err);
  }
}
