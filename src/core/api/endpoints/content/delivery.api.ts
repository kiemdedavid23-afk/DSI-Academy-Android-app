import {http} from '@core/network';
import {sessionStore} from '@core/session';
import {catchNet} from './common.api';
import {failure} from './common.mapper';
import {mapDelivery} from './delivery.mapper';
import type {DeliveryResult} from './delivery.types';

/**
 * GET /content/:id/deliver — seule route du Worker Contenu qui exige la preuve
 * d'accès (X-Access-Proof). Lecture uniquement : l'app lit en direct chez la
 * source. Par défaut aucun téléchargement ; intent='download' (v1.2) ne
 * retient que les fichiers téléchargeables et renvoie suggestedFilename.
 * Pour une formation, appeler avec l'id du module enfant, jamais celui de la
 * formation (elle n'a pas d'asset propre).
 */
export async function fetchDeliveryLink(
  contentId: number,
  intent?: 'download',
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
      .get(`/content/${contentId}/deliver`, {
        auth: 'accessProof',
        ...(intent === 'download' ? {query: {intent}} : {}),
      });
    return mapDelivery(response.status, response.body, response.bodyKind);
  } catch (err) {
    return catchNet(err);
  }
}
