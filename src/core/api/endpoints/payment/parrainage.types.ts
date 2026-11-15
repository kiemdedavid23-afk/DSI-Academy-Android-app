/**
 * GET /api/membre/parrainage — contrat §2.6 + variantes site (historique).
 */

export type ReferralHistoryItem = {
  type: string | null;
  montant: number | null;
  identifiantDsiFilleul: string | null;
  date: string | null;
};

export type MemberReferral = {
  codeParrainagePersonnel: string | null;
  filleulsDirectsTotal: number;
  filleulsDirectsActifs: number;
  recompensesNiveau1Dsi: number;
  recompensesNiveau2Dsi: number;
  totalDsiParrainage: number;
  historique: ReferralHistoryItem[];
  /** Contrat */
  historiqueLimite: number | null;
  /** Site / Worker réel (service site) */
  historiqueHasMore: boolean | null;
};

export type MemberReferralResult =
  | {kind: 'success'; data: MemberReferral}
  | {
      kind: 'failure';
      errorKind: 'network' | 'server' | 'business';
      message?: string;
      notFound?: boolean;
      sessionExpired?: boolean;
    };
