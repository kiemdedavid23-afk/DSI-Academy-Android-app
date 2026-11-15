/**
 * Métadonnées d'affichage des statuts de retrait (contrat §4, site).
 * Valeurs réelles : demande | validee | envoyee | payee | rejetee.
 */

export type KnownWithdrawalStatus =
  | 'demande'
  | 'validee'
  | 'envoyee'
  | 'payee'
  | 'rejetee';

/** Ordre de la frise site (4 étapes ; rejetee hors frise). */
export const WITHDRAWAL_FRIEZE_STEPS: readonly KnownWithdrawalStatus[] = [
  'demande',
  'validee',
  'envoyee',
  'payee',
] as const;

export type WithdrawalStatusMeta = {
  /** Valeur normalisée ou brute */
  status: string;
  known: boolean;
  /** Index dans la frise 0..3, ou -1 si hors frise / inconnu / rejetee */
  friezeIndex: number;
  showFrieze: boolean;
  isRejected: boolean;
  isTerminal: boolean;
  /** Clé i18n withdrawals.status.* si connue */
  labelKey: string | null;
};

const KNOWN = new Set<string>([
  'demande',
  'validee',
  'envoyee',
  'payee',
  'rejetee',
]);

export function withdrawalStatusMeta(
  statut: string | null | undefined,
): WithdrawalStatusMeta {
  const raw = (statut ?? '').trim();
  const status = raw.toLowerCase();
  if (!status || !KNOWN.has(status)) {
    return {
      status: raw || '—',
      known: false,
      friezeIndex: -1,
      showFrieze: false,
      isRejected: false,
      isTerminal: false,
      labelKey: null,
    };
  }
  if (status === 'rejetee') {
    return {
      status,
      known: true,
      friezeIndex: -1,
      showFrieze: false,
      isRejected: true,
      isTerminal: true,
      labelKey: 'withdrawals.status.rejetee',
    };
  }
  const friezeIndex = WITHDRAWAL_FRIEZE_STEPS.indexOf(
    status as KnownWithdrawalStatus,
  );
  return {
    status,
    known: true,
    friezeIndex,
    showFrieze: friezeIndex >= 0,
    isRejected: false,
    isTerminal: status === 'payee',
    labelKey: `withdrawals.status.${status}`,
  };
}
