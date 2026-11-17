import {fetchDeliveryLink} from '../api/endpoints/content/delivery.api';
import {loadTrace} from './loadTrace';
import {rememberMedia} from './recentMedia';
import {fromDeliveryFailure, fromProbeFailure, fromRefusal, tooLarge} from './errors';
import {buildStrategy, planStrategy} from './strategy';
import type {OpenMediaResult} from './types';

/**
 * Ouvre un contenu en lecture directe : demande le lien au Worker
 * (/content/:id/deliver) et choisit la stratégie. Une seule requête vers le
 * Worker, aucun sondage de la source : le lecteur natif (PDF, document, audio,
 * vidéo) ou la lecture du texte vérifie lui-même la source à l'ouverture.
 *
 * Quand la source refuse (lien expiré, introuvable, page web), le lecteur
 * rappelle `openMedia` pour obtenir un nouveau lien : une seule nouvelle
 * demande, comme avant. Le moteur ne garde aucun lien en mémoire. Pour une
 * formation, `contentId` est celui du module enfant. L'adresse n'est jamais
 * journalisée.
 */
export async function openMedia(
  contentId: number,
  options: {signal?: AbortSignal} = {},
): Promise<OpenMediaResult> {
  if (options.signal?.aborted) {
    return fromProbeFailure('aborted', null);
  }
  const delivery = await fetchDeliveryLink(contentId);
  if (delivery.kind === 'failure') {
    loadTrace.finish(true);
    return fromDeliveryFailure(delivery);
  }
  const link = delivery.link;
  loadTrace.step('open');

  const plan = planStrategy(link);
  if ('refusal' in plan) {
    return fromRefusal(plan.refusal);
  }

  const strategy = buildStrategy(link, plan.kind, null);
  if ('refusal' in strategy) {
    return fromRefusal(strategy.refusal);
  }
  if (
    strategy.kind === 'boundedText' &&
    strategy.totalBytes !== null &&
    strategy.totalBytes > strategy.maxBytes
  ) {
    return tooLarge();
  }
  const media = {
    contentId: link.contentId,
    contentType: link.contentType,
    providerId: link.providerId,
    format: link.format.toLowerCase(),
    strategy,
    openedAt: Date.now(),
  };
  rememberMedia(media);
  return {kind: 'success', media};
}
