/**
 * Mapper POST /api/auth/connexion.
 * Décide sur le champ status (et la présence des jetons), jamais sur le code HTTP métier.
 * Contrat : docs/contrats/payment/auth-connexion.md
 */

import type {
  AuthConnexionResult,
  PaymentMode,
} from './auth.types';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function asNullableString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return typeof value === 'string' ? value : null;
}

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asExpiresIn(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }
  return 604800;
}

function paymentModeOf(value: unknown): PaymentMode {
  return value === 'direct' ? 'direct' : 'hosted';
}

/**
 * Transforme le corps HTTP en résultat discriminé.
 * HTTP 400 (erreur) → failure.
 */
export function mapAuthConnexionResponse(
  status: number,
  body: unknown,
): AuthConnexionResult {
  const payload = asRecord(body);

  if (status === 400) {
    const msg =
      asString(payload?.erreur) ?? asString(payload?.message) ?? undefined;
    return {kind: 'failure', message: msg};
  }

  if (!payload) {
    return {kind: 'failure'};
  }

  const statusField = asString(payload.status);

  if (statusField === 'connecte') {
    const token = asString(payload.token);
    if (!token) {
      return {kind: 'failure'};
    }
    return {
      kind: 'session',
      userId: asString(payload.userId) ?? '',
      accountStatus: asNullableString(payload.accountStatus),
      subscriptionStatus: asNullableString(payload.subscriptionStatus),
      subscriptionActive: asBool(payload.subscriptionActive, false),
      dateFin: asNullableString(payload.dateFin),
      token,
      expiresIn: asExpiresIn(payload.expiresIn),
      accessProof: asNullableString(payload.accessProof),
    };
  }

  if (statusField === 'pending_payment') {
    const tracking = asString(payload.paymentTrackingToken);
    if (!tracking) {
      return {kind: 'failure'};
    }
    const mode = paymentModeOf(payload.paymentMode);
    const url =
      mode === 'direct' ? null : asNullableString(payload.paymentUrl);
    return {
      kind: 'pendingPayment',
      userId: asString(payload.userId) ?? '',
      paymentTrackingToken: tracking,
      paymentMode: mode,
      paymentUrl: url,
    };
  }

  if (statusField === 'refuse' || statusField === 'suspendu') {
    return {
      kind: 'failure',
      message: asString(payload.message) ?? undefined,
    };
  }

  return {kind: 'failure'};
}
