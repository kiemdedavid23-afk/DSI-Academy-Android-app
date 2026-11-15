import {fetchDeliveryLink} from '../api/endpoints/content/delivery.api';
import {probeSource} from '../network/sourceProbe';
import type {ProbeResult} from '../network/sourceProbe';
import {
  fromDeliveryFailure,
  fromProbeFailure,
  fromRefusal,
  tooLarge,
} from './errors';
import {buildStrategy, planStrategy} from './strategy';
import type {MediaFailure, OpenMediaResult} from './types';

/**
 * Nombre d'essais de résolution du lien : le premier, puis un seul de plus si
 * la source refuse le lien (expiré, refusé, introuvable ou page web).
 */
const MAX_RESOLVE_ATTEMPTS = 2;

const RE_RESOLVE_REASONS = ['rejected', 'notFound', 'htmlPage'];

/**
 * Ouvre un contenu en lecture directe : demande le lien au Worker
 * (/content/:id/deliver), choisit la stratégie, vérifie que la source répond
 * bien avec un fichier, et relance une fois la résolution si le lien est refusé.
 *
 * Le lecteur rappelle `openMedia` quand la source refuse en cours de lecture
 * (lien expiré) : le moteur ne garde aucun lien en mémoire. Pour une formation,
 * `contentId` est celui du module enfant. L'adresse n'est jamais journalisée.
 */
export async function openMedia(
  contentId: number,
  options: {signal?: AbortSignal} = {},
): Promise<OpenMediaResult> {
  let lastFailure: MediaFailure | null = null;

  for (let attempt = 0; attempt < MAX_RESOLVE_ATTEMPTS; attempt += 1) {
    if (options.signal?.aborted) {
      return fromProbeFailure('aborted', null);
    }
    const delivery = await fetchDeliveryLink(contentId);
    if (delivery.kind === 'failure') {
      return fromDeliveryFailure(delivery);
    }
    const link = delivery.link;

    const plan = planStrategy(link);
    if ('refusal' in plan) {
      return fromRefusal(plan.refusal);
    }

    let probe: Extract<ProbeResult, {kind: 'ok'}> | null = null;
    if (plan.kind !== 'embeddedYoutube') {
      const result = await probeSource(link.url, {signal: options.signal});
      if (result.kind === 'failure') {
        lastFailure = fromProbeFailure(result.reason, result.status);
        if (RE_RESOLVE_REASONS.includes(result.reason)) {
          continue;
        }
        return lastFailure;
      }
      probe = result;
    }

    const strategy = buildStrategy(link, plan.kind, probe);
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
    return {
      kind: 'success',
      media: {
        contentId: link.contentId,
        contentType: link.contentType,
        providerId: link.providerId,
        format: link.format.toLowerCase(),
        strategy,
        openedAt: Date.now(),
      },
    };
  }

  return lastFailure ?? fromProbeFailure('network', null);
}
