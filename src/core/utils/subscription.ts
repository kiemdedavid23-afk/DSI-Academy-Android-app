/**
 * Calcul pur de l'état d'abonnement (site MemberDrawer.computeSubscription).
 * Aucun design, aucune i18n.
 */

const DAY_MS = 86_400_000;

export type SubscriptionInput = {
  dateDebut?: string | null;
  dateFin?: string | null;
  statut?: string | null;
};

export type SubscriptionComputed =
  | {state: 'none'}
  | {state: 'expired'; fin: Date}
  | {state: 'active'; fin: Date; days: number; percent: number};

/**
 * dateFin fait foi. dateDebut absente → percent 100 si actif.
 * Date invalide / absente → none.
 */
export function computeSubscription(
  abonnement: SubscriptionInput | null | undefined,
  now = Date.now(),
): SubscriptionComputed {
  if (!abonnement?.dateFin) {
    return {state: 'none'};
  }
  const fin = new Date(abonnement.dateFin);
  if (Number.isNaN(fin.getTime())) {
    return {state: 'none'};
  }
  const msLeft = fin.getTime() - now;
  if (msLeft <= 0) {
    return {state: 'expired', fin};
  }
  const debut = abonnement.dateDebut ? new Date(abonnement.dateDebut) : null;
  let percent = 100;
  if (debut && !Number.isNaN(debut.getTime()) && fin.getTime() > debut.getTime()) {
    percent = Math.min(
      100,
      Math.max(0, Math.round((msLeft / (fin.getTime() - debut.getTime())) * 100)),
    );
  }
  return {
    state: 'active',
    fin,
    days: Math.ceil(msLeft / DAY_MS),
    percent,
  };
}
