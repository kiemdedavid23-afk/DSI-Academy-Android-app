/** Nature de l'échec (L8a) → clé i18n. Aucun texte du Worker n'est affiché. */

import type {CommerceErrorKind} from '../store/commerceTypes';

export function commerceErrorKey(kind: CommerceErrorKind | null): string {
  switch (kind) {
    case 'network':
      return 'app.catalogue.errorNetwork';
    case 'unauthorized':
    case 'noProof':
      return 'mp.states.errorSession';
    case 'unavailable':
      return 'mp.states.errorBusy';
    case 'server':
    case 'upstream':
      return 'app.catalogue.errorServer';
    case 'notFound':
    case 'productUnavailable':
      return 'commerce.notFound';
    default:
      return 'app.catalogue.errorGeneric';
  }
}

/** Libellés de catégorie du site : mp.cats.* / shop.cats.*, sinon le code brut. */
export function categoryKeys(
  source: 'shop' | 'marketplace',
  slug: string,
): string[] {
  const own = source === 'shop' ? 'shop' : 'mp';
  const other = source === 'shop' ? 'mp' : 'shop';
  return [`${own}.cats.${slug}`, `${other}.cats.${slug}`];
}
