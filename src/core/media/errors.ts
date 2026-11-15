import type {ContentFailure} from '../api/endpoints/content/common.types';
import type {ProbeFailureReason} from '../network/sourceProbe';
import type {MediaFailure, StrategyRefusal} from './types';

function media(
  errorKind: MediaFailure['errorKind'],
  code: string | null,
  retryable: boolean,
): MediaFailure {
  return {kind: 'failure', errorKind, code, retryable};
}

/** Échec du Worker (/deliver) → échec du moteur. Le code du Worker est conservé. */
export function fromDeliveryFailure(f: ContentFailure): MediaFailure {
  const code = f.code;
  if (f.errorKind === 'unsupportedMode') {
    return media('workerNotMigrated', code, false);
  }
  if (f.errorKind === 'noProof' || f.errorKind === 'unauthorized') {
    return media('accessDenied', code, false);
  }
  switch (code) {
    case 'ACCESS_SUBSCRIPTION_INACTIVE':
      return media('subscriptionInactive', code, false);
    case 'CONTENT_NOT_AVAILABLE':
      return media('notAvailable', code, false);
    case 'CONTENT_NOT_FOUND':
      return media('notFound', code, false);
    case 'NO_COMPATIBLE_ASSET':
    case 'NO_DELIVERABLE_ASSET':
    case 'NO_DOWNLOADABLE_ASSET':
      return media('noAsset', code, false);
    case 'LINK_UNAVAILABLE_FOR_PROVIDER':
      return media('sourceUnavailable', code, true);
    default:
      break;
  }
  switch (f.errorKind) {
    case 'network':
      return media('network', code, true);
    case 'validation':
      return media('invalidRequest', code, false);
    case 'notFound':
      return media('notFound', code, false);
    case 'forbidden':
      return media('notAvailable', code, false);
    case 'providerLink':
      return media('sourceUnavailable', code, true);
    default:
      return media('server', code, true);
  }
}

/** Échec du sondage de la source → échec du moteur. */
export function fromProbeFailure(
  reason: ProbeFailureReason,
  status: number | null,
): MediaFailure {
  const code = status === null ? null : `SOURCE_HTTP_${status}`;
  switch (reason) {
    case 'network':
      return media('network', code, true);
    case 'timeout':
      return media('timeout', code, true);
    case 'aborted':
      return media('aborted', code, false);
    case 'rejected':
      return media('sourceRejected', code, false);
    case 'notFound':
      return media('sourceUnavailable', code, false);
    case 'rateLimited':
      return media('sourceRateLimited', code, true);
    case 'htmlPage':
      return media('sourceHtmlPage', 'SOURCE_HTML_PAGE', false);
    default:
      return media('sourceServer', code, true);
  }
}

export function fromRefusal(refusal: StrategyRefusal): MediaFailure {
  if (refusal === 'UNSUPPORTED_PROVIDER') {
    return media('unsupportedProvider', refusal, false);
  }
  return media('unsupportedFormat', refusal, false);
}

export function tooLarge(): MediaFailure {
  return media('tooLarge', 'TEXT_TOO_LARGE', false);
}
