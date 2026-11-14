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

/**
 * Nature de l'échec de connexion (discriminé côté API/mapper, stocké par le store).
 * - credentials : mauvais identifiants / HTTP 400 / status refuse
 * - refused    : compte suspendu (status suspendu)
 * - network    : coupure, timeout, annulation
 * - server     : 5xx, 401/429 inattendus, JSON illisible, status inconnu
 */
export type LoginErrorKind =
  | 'credentials'
  | 'refused'
  | 'network'
  | 'server';

export type FailureAuthResult = {
  kind: 'failure';
  errorKind: LoginErrorKind;
  /** Texte métier du Worker (credentials / refused), sinon absent. */
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
