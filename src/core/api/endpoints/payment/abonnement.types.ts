/**
 * POST /api/abonnement/renouveler — contrat §2.8
 */

export type RenewMode = 'dsi' | 'fcfa';

export type RenewFcfaPayment = {
  reseau: string;
  numeroPaiement: string;
  otp?: string;
  email?: string;
};

export type RenewRequest =
  | {modePaiement: 'dsi'}
  | {modePaiement: 'fcfa'; paiement?: RenewFcfaPayment};

export type RenewResult =
  | {kind: 'success'; status: 'active'; message: string | null}
  | {
      kind: 'success';
      status: 'pending_payment';
      paymentMode: 'direct' | 'hosted' | string | null;
      paymentUrl: string | null;
      paymentTrackingToken: string;
      message: string | null;
    }
  | {kind: 'success'; status: 'refuse'; message: string | null; champ?: string | null}
  | {
      kind: 'failure';
      errorKind: 'network' | 'server' | 'business' | 'unavailable';
      message?: string;
      sessionExpired?: boolean;
    };
