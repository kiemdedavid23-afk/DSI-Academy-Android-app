/**
 * GET /api/membre/paiements — contrat §2.4 (élément non figé §6).
 * Champs lus par le site, tous optionnels côté app.
 */

export type PaymentStatus = 'paid' | 'pending' | string;

export type MemberPayment = {
  idTransaction: string | null;
  referenceExterne: string | null;
  typePaiement: string | null;
  plateforme: string | null;
  montant: number | string | null;
  devise: string | null;
  statut: PaymentStatus | null;
  dateConfirmation: string | null;
  dateCreation: string | null;
};

export type MemberPaymentsPage = {
  paiements: MemberPayment[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type MemberPaymentsResult =
  | {kind: 'success'; data: MemberPaymentsPage}
  | {
      kind: 'failure';
      errorKind: 'network' | 'server' | 'business';
      message?: string;
      notFound?: boolean;
      sessionExpired?: boolean;
    };
