/** Dates des discussions (millisecondes) : heure le jour même, sinon date courte. */

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatClock(ms: number, locale: string): string {
  return new Date(ms).toLocaleTimeString(locale, {hour: '2-digit', minute: '2-digit'});
}

export function formatListTime(ms: number | null, locale: string, now = new Date()): string {
  if (ms === null) {
    return '';
  }
  const d = new Date(ms);
  return sameDay(d, now)
    ? formatClock(ms, locale)
    : d.toLocaleDateString(locale, {day: 'numeric', month: 'short'});
}
