/**
 * GET /api/paiement/reseaux, GET /api/paiement/statut — contrat §1.3 §1.4
 */

export type PaymentNetwork = {
  code: string;
  libelle: string;
  otpRequis: boolean;
  /** Présent côté site ; string sinon ''. Contient déjà le montant total. */
  instructionsOtp: string;
};

export type PaymentNetworksCatalog = {
  mode: 'direct' | 'hosted' | string;
  montant: number;
  prix: number | null;
  frais: number | null;
  devise: string | null;
  reseaux: PaymentNetwork[];
};

export type PaymentNetworksResult =
  | {kind: 'success'; data: PaymentNetworksCatalog}
  | {
      kind: 'failure';
      errorKind: 'network' | 'server' | 'business' | 'unavailable';
      message?: string;
    };

export type PaymentStatusValue =
  | 'non_initie'
  | 'attente'
  | 'active'
  | 'refuse'
  | 'introuvable'
  | string;

export type PaymentStatusResult =
  | {kind: 'success'; status: PaymentStatusValue}
  | {
      kind: 'failure';
      errorKind: 'network' | 'server' | 'business' | 'unavailable';
      message?: string;
      sessionExpired?: boolean;
    };
