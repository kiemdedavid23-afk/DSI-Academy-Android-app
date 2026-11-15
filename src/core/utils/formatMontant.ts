/**
 * Affichage seul : le montant Worker n'est jamais modifié.
 * Jusqu'à 8 décimales utiles + devise.
 */
export function formatMontant(
  montant: number | string | null | undefined,
  devise: string | null | undefined,
  locale: string,
): string {
  if (montant === null || montant === undefined || montant === '') {
    return '—';
  }
  const n = typeof montant === 'number' ? montant : Number(montant);
  let body: string;
  if (!Number.isFinite(n)) {
    body = String(montant);
  } else {
    body = new Intl.NumberFormat(locale, {
      maximumFractionDigits: 8,
    }).format(n);
  }
  const d = (devise ?? '').trim();
  return d ? `${body} ${d}` : body;
}
