/** Analyses vendeur (lot S7) : mises en forme et géométrie des courbes, sans écran. */

import type {SellerMetric, SellerPeriod} from '../../store/sellerTypes';

export const ANALYTICS_PERIODS: SellerPeriod[] = ['7d', '30d', '12m', 'all'];

/** Variation en badge : « +16,7 % », « Nouveau » (hausse sans période précédente) ou null. */
export function deltaBadge(
  metric: Pick<SellerMetric, 'deltaPct' | 'trend'>,
  lang: string,
  newLabel: string,
): string | null {
  if (metric.deltaPct === null) {
    return metric.trend === 'up' ? newLabel : null;
  }
  const n = Math.abs(metric.deltaPct).toFixed(1);
  const text = lang.toLowerCase().startsWith('fr') ? n.replace('.', ',') : n;
  const sign = metric.deltaPct > 0 ? '+' : metric.deltaPct < 0 ? '−' : '';
  return `${sign}${text} %`;
}

/** Pourcentage à une décimale, virgule en français. */
export function formatPercent(percent: number, lang: string): string {
  const n = percent.toFixed(1);
  return `${lang.toLowerCase().startsWith('fr') ? n.replace('.', ',') : n} %`;
}

/** `YYYY-MM-DD` → `JJ/MM` ; `YYYY-MM` → `MM/AAAA`. Autre format : renvoyé tel quel. */
export function seriesLabel(date: string): string {
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (day) {
    return `${day[3]}/${day[2]}`;
  }
  const month = /^(\d{4})-(\d{2})$/.exec(date);
  return month ? `${month[2]}/${month[1]}` : date;
}

export type ChartPoint = {x: number; y: number};

/**
 * Points d'une courbe dans un cadre `width` × `height` avec marge `pad`.
 * Valeurs toutes nulles : ligne plate en bas. Un seul point : centré.
 */
export function chartPoints(values: number[], width: number, height: number, pad = 8): ChartPoint[] {
  const n = values.length;
  if (n === 0 || width <= 2 * pad || height <= 2 * pad) {
    return [];
  }
  const max = Math.max(...values, 0);
  const innerW = width - 2 * pad;
  const innerH = height - 2 * pad;
  return values.map((v, i) => ({
    x: n === 1 ? width / 2 : pad + (i * innerW) / (n - 1),
    y: max <= 0 ? height - pad : height - pad - (Math.max(v, 0) / max) * innerH,
  }));
}

export function pointsAttr(points: ChartPoint[]): string {
  return points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
}

/** Zone sous la courbe (polygone fermé sur la base du cadre). */
export function areaAttr(points: ChartPoint[], height: number, pad = 8): string {
  if (points.length === 0) {
    return '';
  }
  const first = points[0];
  const last = points[points.length - 1];
  return `${first.x.toFixed(1)},${(height - pad).toFixed(1)} ${pointsAttr(points)} ${last.x.toFixed(1)},${(height - pad).toFixed(1)}`;
}

/** Largeur relative (0 à 1) d'une barre ; au moins un filet visible si la valeur est positive. */
export function barRatio(value: number, max: number): number {
  if (!Number.isFinite(value) || value <= 0 || max <= 0) {
    return 0;
  }
  return Math.max(0.02, Math.min(1, value / max));
}

export function hasSeriesData(values: number[]): boolean {
  return values.some(v => v > 0);
}

/** Échec du store analyses → clé i18n. Jamais le texte du Worker (D17). */
export function analyticsErrorKey(error: string | null): string {
  switch (error) {
    case 'network':
      return 'app.catalogue.errorNetwork';
    case 'noProof':
    case 'unauthorized':
      return 'mp.states.errorSession';
    case 'forbidden':
      return 'commerce.sellerSpace.overview.forbidden';
    case 'server':
    case 'upstream':
    case 'unavailable':
      return 'app.catalogue.errorServer';
    default:
      return 'app.catalogue.errorGeneric';
  }
}
