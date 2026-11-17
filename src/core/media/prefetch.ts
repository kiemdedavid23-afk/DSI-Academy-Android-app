import NetInfo from '@react-native-community/netinfo';
import {fetchDeliveryLink} from '../api/endpoints/content/delivery.api';
import {isPdfNativeAvailable, prefetchPdf} from './pdfNative';
import {buildStrategy, planStrategy} from './strategy';

/**
 * Préchargement du module suivant d'une formation : seuls les PDF sont déposés
 * dans le cache de 24 h (audio et vidéo sont lus en flux). Le lien est demandé
 * au Worker comme pour une ouverture normale (le contrôle d'accès reste fait).
 * Par défaut uniquement en Wi-Fi, pour ne pas consommer les données mobiles.
 */
export const PREFETCH_ON_CELLULAR = false;
export const MAX_PREFETCH_BYTES = 40 * 1024 * 1024;

const inFlight = new Set<number>();

export async function prefetchNextModule(contentId: number): Promise<void> {
  if (inFlight.has(contentId) || !isPdfNativeAvailable()) {
    return;
  }
  inFlight.add(contentId);
  try {
    if (!PREFETCH_ON_CELLULAR) {
      const net = await NetInfo.fetch();
      if (net.type !== 'wifi' && net.type !== 'ethernet') {
        return;
      }
    }
    const delivery = await fetchDeliveryLink(contentId);
    if (delivery.kind === 'failure') {
      return;
    }
    const plan = planStrategy(delivery.link);
    if ('refusal' in plan || plan.kind !== 'tempFile') {
      return;
    }
    const strategy = buildStrategy(delivery.link, plan.kind, null);
    if ('refusal' in strategy || strategy.kind !== 'tempFile' || strategy.format.toLowerCase() !== 'pdf') {
      return;
    }
    if (strategy.totalBytes !== null && strategy.totalBytes > MAX_PREFETCH_BYTES) {
      return;
    }
    await prefetchPdf(strategy.url, `pf-${contentId}`, String(contentId), MAX_PREFETCH_BYTES);
  } catch {
    // Préchargement au mieux : sans conséquence.
  } finally {
    inFlight.delete(contentId);
  }
}
