/** Code d'erreur du Worker / type d'échec → clé i18n (aucun texte inventé). */

import type {ContentErrorKind} from '@core/utils/contentDisplay';

export function contentErrorKey(kind: ContentErrorKind | null): string {
  switch (kind) {
    case 'network':
      return 'app.catalogue.errorNetwork';
    case 'server':
      return 'app.catalogue.errorServer';
    case 'notFound':
      return 'content.notFound';
    case 'unavailable':
    case 'forbidden':
      return 'content.contentNotAvailable';
    default:
      return 'app.catalogue.errorGeneric';
  }
}
