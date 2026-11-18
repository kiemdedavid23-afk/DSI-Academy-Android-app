/** Montant DSI entier avec espace fine insécable tous les trois chiffres. */
export function formatDsiAmount(amount: number): string {
  const negative = amount < 0;
  const digits = String(Math.abs(Math.trunc(amount)));
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
  return negative ? `-${grouped}` : grouped;
}
