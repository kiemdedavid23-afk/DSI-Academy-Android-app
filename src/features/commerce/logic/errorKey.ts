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

/** Échec d'un achat → clé i18n du message (textes du site pour la Marketplace). */
export function purchaseErrorKey(kind: CommerceErrorKind | null): string {
  switch (kind) {
    case 'subscriptionInactive':
      return 'mp.checkout.errors.subscription';
    case 'insufficientBalance':
      return 'mp.checkout.errors.insufficient';
    case 'paymentRefused':
      return 'commerce.paymentRefused';
    case 'selfPurchase':
      return 'commerce.selfPurchase';
    case 'indeterminate':
      return 'commerce.indeterminate';
    default:
      return commerceErrorKey(kind);
  }
}

/** Échec d'ouverture d'un achat → clé i18n (textes du site). */
export function accessErrorKey(kind: CommerceErrorKind | null): string {
  switch (kind) {
    case 'network':
      return 'mp.orders.accessErrors.network';
    case 'unauthorized':
    case 'noProof':
      return 'mp.orders.accessErrors.session';
    case 'entitlementUnavailable':
    case 'productUnavailable':
    case 'notFound':
      return 'mp.orders.accessErrors.unavailable';
    case 'reconciliationPending':
    case 'conflict':
      return 'mp.orders.accessErrors.unpaid';
    default:
      return 'mp.orders.accessErrors.unknown';
  }
}

/** Libellé de statut d'une commande (textes du site). */
export function orderStatusKey(
  status: 'processing' | 'paid' | 'failed' | 'refunded',
  rawStatus: string | null,
): string {
  switch (status) {
    case 'paid':
      return 'mp.status.paid';
    case 'failed':
      return 'mp.status.failed';
    case 'refunded':
      return 'commerce.refunded';
    default:
      return rawStatus === 'pending_payment'
        ? 'mp.status.pending_payment'
        : 'mp.status.processing';
  }
}
