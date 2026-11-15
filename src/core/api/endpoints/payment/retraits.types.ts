import type {MemberWithdrawal} from './membre.types';

export type WithdrawRequestBody = {
  montantDsi: number;
  moyenPaiement: string;
  numeroPaiement: string;
};

export type WithdrawRequestResult =
  | {
      kind: 'success';
      status: 'demande_enregistree';
      idRetrait: string;
      montantDsiDemande: number;
      montantDsiNet: number;
      montantFcfaDemande: number;
      fraisRetraitFcfa: number;
      /** NET reçu */
      montantFcfa: number;
      statut: string;
      dateDemande: string | null;
      moyenPaiement: string | null;
      message: string | null;
    }
  | {
      kind: 'success';
      status: 'refuse';
      message: string | null;
    }
  | {
      kind: 'failure';
      errorKind: 'network' | 'server' | 'business' | 'unavailable' | 'uncertain';
      message?: string;
    };

export type WithdrawalEvent = {
  champ: string | null;
  ancienneValeur: string | null;
  nouvelleValeur: string | null;
  date: string | null;
};

export type WithdrawalHistoryDetail = {
  idRetrait: string;
  evenements: WithdrawalEvent[];
};

export type WithdrawalHistoryDetailResult =
  | {kind: 'success'; data: WithdrawalHistoryDetail}
  | {
      kind: 'failure';
      errorKind: 'network' | 'server' | 'business';
      message?: string;
      notFound?: boolean;
    };

export type {MemberWithdrawal};
