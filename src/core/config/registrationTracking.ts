/**
 * Jeton de suivi d'inscription (pending_payment) — stocké À PART de la session.
 * Validité 24 h côté Worker ; un jeton expiré est ignoré à la lecture.
 * L1b consommera ces données pour reprendre le paiement.
 */

import {secureGet, secureRemove, secureSet} from '../storage/secureStorage';

const TRACKING_KEY = 'registration_tracking';
const TRACKING_TTL_MS = 24 * 60 * 60 * 1000;

export type PaymentMode = 'direct' | 'hosted';

export type RegistrationTracking = {
  userId: string;
  paymentTrackingToken: string;
  paymentMode: PaymentMode;
  paymentUrl: string | null;
  expiresAt: number;
};

function isMode(value: unknown): value is PaymentMode {
  return value === 'direct' || value === 'hosted';
}

export const registrationTracking = {
  async save(input: {
    userId: string;
    paymentTrackingToken: string;
    paymentMode: PaymentMode;
    paymentUrl: string | null;
    now?: number;
  }): Promise<void> {
    const now = input.now ?? Date.now();
    const payload: RegistrationTracking = {
      userId: input.userId,
      paymentTrackingToken: input.paymentTrackingToken,
      paymentMode: input.paymentMode,
      paymentUrl: input.paymentUrl,
      expiresAt: now + TRACKING_TTL_MS,
    };
    await secureSet(TRACKING_KEY, JSON.stringify(payload));
  },

  async read(now = Date.now()): Promise<RegistrationTracking | null> {
    const raw = await secureGet(TRACKING_KEY);
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw) as Partial<RegistrationTracking>;
      if (
        typeof parsed.paymentTrackingToken !== 'string' ||
        !parsed.paymentTrackingToken ||
        typeof parsed.expiresAt !== 'number' ||
        !isMode(parsed.paymentMode)
      ) {
        await secureRemove(TRACKING_KEY);
        return null;
      }
      if (parsed.expiresAt <= now) {
        await secureRemove(TRACKING_KEY);
        return null;
      }
      return {
        userId: typeof parsed.userId === 'string' ? parsed.userId : '',
        paymentTrackingToken: parsed.paymentTrackingToken,
        paymentMode: parsed.paymentMode,
        paymentUrl:
          parsed.paymentUrl === null || typeof parsed.paymentUrl === 'string'
            ? parsed.paymentUrl
            : null,
        expiresAt: parsed.expiresAt,
      };
    } catch {
      await secureRemove(TRACKING_KEY);
      return null;
    }
  },

  async clear(): Promise<void> {
    await secureRemove(TRACKING_KEY);
  },
};
