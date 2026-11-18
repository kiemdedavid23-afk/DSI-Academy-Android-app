import type {EnvelopeResult} from '@core/network';
import {isHttpsUrl} from '../../../config/urlGuards';
import type {
  CommerceErrorKind,
  CommerceFailure,
  CommerceOrderStatus,
  CommerceSource,
} from './commerce.types';

export function asRecord(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

export function asString(v: unknown): string | null {
  return typeof v === 'string' && v !== '' ? v : null;
}

export function asInt(v: unknown): number | null {
  return typeof v === 'number' && Number.isInteger(v) ? v : null;
}

export function asNumber(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

export function asBool(v: unknown): boolean {
  return v === true || v === 1;
}

/** Image : https uniquement, sinon null (le placeholder est côté écran). */
export function asHttpsUrl(v: unknown): string | null {
  return isHttpsUrl(v) ? v : null;
}

/** Date en millisecondes ; accepte un nombre ou une date ISO. */
export function asEpochMs(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return v;
  }
  if (typeof v === 'string' && v !== '') {
    const t = Date.parse(v);
    return Number.isNaN(t) ? null : t;
  }
  return null;
}

export function failure(
  errorKind: CommerceErrorKind,
  status: number | null,
  code: string | null = null,
): CommerceFailure {
  return {kind: 'failure', errorKind, status, code};
}

/** Codes métier → nature de l'échec (prioritaires sur le statut HTTP). */
const CODE_KIND: Record<string, CommerceErrorKind> = {
  ACCOUNT_ACCESS_DENIED: 'accountDenied',
  SUBSCRIPTION_INACTIVE: 'subscriptionInactive',
  INSUFFICIENT_BALANCE: 'insufficientBalance',
  PAYMENT_REJECTED: 'paymentRefused',
  LISTING_PRIVATE: 'productUnavailable',
  PRODUCT_ARCHIVED: 'productUnavailable',
  PRODUCT_NOT_PUBLISHABLE: 'productUnavailable',
  PRODUCT_NOT_FOUND: 'productUnavailable',
  SELLER_UNAVAILABLE: 'productUnavailable',
  CONTENT_FILE_REQUIRED: 'productUnavailable',
  SELF_PURCHASE_FORBIDDEN: 'selfPurchase',
  PAYMENT_RECONCILIATION_PENDING: 'reconciliationPending',
  ENTITLEMENT_ASSET_UNAVAILABLE: 'entitlementUnavailable',
  NETWORK_ERROR: 'network',
  INVALID_RESPONSE: 'invalidResponse',
};

export type FailureContext = 'read' | 'purchase';

/**
 * Échec d'une enveloppe : décidé par le code, puis par le statut HTTP,
 * jamais par le texte de `error`.
 * 502 à l'achat : Boutique = débit refusé (sans motif), Marketplace =
 * résultat indéterminé (rejouer avec la même clé).
 */
export function failureFromEnvelope(
  env: EnvelopeResult,
  source: CommerceSource,
  context: FailureContext = 'read',
): CommerceFailure {
  const {status, code} = env;
  if (code && code.startsWith('ACCESS_PROOF')) {
    return failure('unauthorized', status, code);
  }
  if (code && CODE_KIND[code]) {
    return failure(CODE_KIND[code], status, code);
  }
  if (status === 0) {
    return failure('network', status, code);
  }
  if (status === 401) {
    return failure('unauthorized', status, code);
  }
  if (status === 403) {
    return failure('forbidden', status, code);
  }
  if (status === 404) {
    return failure('notFound', status, code);
  }
  if (status === 409) {
    return failure('conflict', status, code);
  }
  if (status === 400 || status === 422) {
    return failure('validation', status, code);
  }
  if (status === 429 || status === 503) {
    return failure('unavailable', status, code);
  }
  if (status === 502) {
    if (context === 'purchase') {
      return failure(
        source === 'shop' ? 'paymentRefused' : 'indeterminate',
        status,
        code,
      );
    }
    return failure('upstream', status, code);
  }
  return failure('server', status, code);
}

/**
 * Contrôle commun : null si l'enveloppe est un succès exploitable (2xx,
 * success vrai), sinon l'échec à renvoyer.
 */
export function checkEnvelope(
  env: EnvelopeResult,
  source: CommerceSource,
  context: FailureContext = 'read',
): CommerceFailure | null {
  if (!env.success || env.status < 200 || env.status >= 300) {
    return failureFromEnvelope(env, source, context);
  }
  return null;
}

/**
 * Statut brut → statut unifié. Tout statut inconnu reste « en cours » :
 * on ne déclare jamais payée ou échouée une commande qu'on ne comprend pas.
 */
export function normalizeOrderStatus(raw: unknown): CommerceOrderStatus {
  if (raw === 'paid') {
    return 'paid';
  }
  if (raw === 'failed') {
    return 'failed';
  }
  if (raw === 'refunded') {
    return 'refunded';
  }
  return 'processing';
}
