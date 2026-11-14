/**
 * Types domaine membre — Worker Paiement §2.1, §2.2, §2.3, §2.10.
 */

export type MemberAccountStatus =
  | 'active'
  | 'suspended'
  | 'pending_payment'
  | 'expired'
  | string;

export type MemberProfile = {
  identifiantDsi: string;
  nom: string;
  prenom: string;
  whatsapp: string | null;
  email: string | null;
  pays: string | null;
  statut: MemberAccountStatus;
  codeParrainagePersonnel: string | null;
};

export type MemberBalance = {
  identifiantDsi: string;
  soldeDsiActuel: number;
  totalDsiGagnes: number;
};

export type MemberSubscription = {
  formule: string | null;
  dateDebut: string | null;
  dateFin: string | null;
  statut: string | null;
  modePaiement: string | null;
  /** Contrat ne détaille pas encore les éléments. */
  renouvellements: unknown[];
};

export type WithdrawalStatus = 'en_attente' | 'traite' | string;

export type MemberWithdrawal = {
  idRetrait: string;
  montantDsiDemande: number;
  contributionStabiliteDsi: number;
  montantDsiNet: number;
  montantFcfa: number;
  statut: WithdrawalStatus;
  dateDemande: string | null;
  dateTraitement: string | null;
  moyenPaiement: string | null;
  numeroPaiement: string | null;
  pays: string | null;
  reglesAppliquees: unknown;
  referenceSequestre: string | null;
};

export type MemberWithdrawalsPage = {
  total: number;
  retraits: MemberWithdrawal[];
};

export type MemberFetchFailure = {
  kind: 'failure';
  errorKind: 'network' | 'server' | 'business';
  message?: string;
};

export type MemberProfileResult =
  | {kind: 'success'; data: MemberProfile}
  | MemberFetchFailure;

export type MemberBalanceResult =
  | {kind: 'success'; data: MemberBalance}
  | MemberFetchFailure;

export type MemberSubscriptionResult =
  | {kind: 'success'; data: MemberSubscription}
  | MemberFetchFailure;

export type MemberWithdrawalsResult =
  | {kind: 'success'; data: MemberWithdrawalsPage}
  | MemberFetchFailure;
