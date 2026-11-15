/** Échec de lecture (moteur) → clé i18n. Jamais de texte du Worker ni de la source. */

import type {MediaErrorKind} from '../media/types';

export type {MediaErrorKind} from '../media/types';

export function readerErrorKey(kind: MediaErrorKind | null): string {
  switch (kind) {
    case 'accessDenied':
      return 'content.accessProofMissing';
    case 'subscriptionInactive':
      return 'content.accessDenied';
    case 'notAvailable':
    case 'notFound':
    case 'noAsset':
      return 'content.contentNotAvailable';
    case 'network':
    case 'timeout':
      return 'app.catalogue.errorNetwork';
    case 'tooLarge':
      return 'app.reader.tooLarge';
    case 'unsupportedFormat':
    case 'unsupportedProvider':
    case 'workerNotMigrated':
      return 'app.reader.unsupported';
    case 'sourceRateLimited':
      return 'app.reader.rateLimited';
    default:
      return 'content.deliveryError';
  }
}
