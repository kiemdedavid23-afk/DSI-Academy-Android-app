/**
 * Types du domaine auth (connexion) — service payment.
 */

export type PaymentMode = 'direct' | 'hosted';

export type SessionAuthResult = {
  kind: 'session';
  userId: string;
  accountStatus: string | null;
  subscriptionStatus: string | null;
  subscriptionActive: boolean;
  dateFin: string | null;
  token: string;
  expiresIn: number;
  accessProof: string | null;
};

export type PendingPaymentAuthResult = {
  kind: 'pendingPayment';
  userId: string;
  paymentTrackingToken: string;
  paymentMode: PaymentMode;
  paymentUrl: string | null;
};

export type FailureAuthResult = {
  kind: 'failure';
  message?: string;
};

export type AuthConnexionResult =
  | SessionAuthResult
  | PendingPaymentAuthResult
  | FailureAuthResult;

export type AuthConnexionBody = {
  identifiant: string;
  motDePasse: string;
};
