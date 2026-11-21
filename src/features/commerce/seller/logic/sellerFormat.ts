/**
 * Espace vendeur : mises en forme sans écran. Les montants du Worker sont en
 * DSI entiers ; l'espace vendeur les affiche en FCFA (arithmétique entière).
 */

import type {SellerMetric} from '../../store/sellerTypes';
import {dsiToFcfa} from '@core/utils/dsi';
import {formatDsiAmount} from '../../logic/format';

/** Montant DSI affiché en FCFA, groupé par trois chiffres. */
export function formatFcfaFromDsi(dsi: number): string {
  return formatDsiAmount(dsiToFcfa(dsi));
}

export type MetricDelta =
  | {kind: 'up' | 'down'; pct: number}
  | {kind: 'flat'}
  | {kind: 'new'}
  | {kind: 'none'};

/**
 * Variation d'un indicateur. `deltaPct` nul : pas de période précédente ou
 * précédente à zéro. « Nouveau » seulement si la tendance est à la hausse.
 */
export function metricDelta(metric: SellerMetric): MetricDelta {
  if (metric.deltaPct === null) {
    return metric.trend === 'up' ? {kind: 'new'} : {kind: 'none'};
  }
  const pct = Math.round(Math.abs(metric.deltaPct));
  if (metric.deltaPct > 0 && pct > 0) {
    return {kind: 'up', pct};
  }
  if (metric.deltaPct < 0 && pct > 0) {
    return {kind: 'down', pct};
  }
  return {kind: 'flat'};
}

/** Initiale de l'avatar : première lettre du prénom, sinon du nom de boutique. */
export function avatarInitial(...names: Array<string | null | undefined>): string {
  for (const n of names) {
    const c = n?.trim().charAt(0);
    if (c) {
      return c.toLocaleUpperCase();
    }
  }
  return '·';
}

/**
 * Message d'erreur du store → clé i18n. `CONFIG` : solde indisponible
 * (503 du Worker, aucune donnée partielle, D14).
 */
export function overviewErrorKey(error: string | null): string {
  switch (error) {
    case 'CONFIG':
      return 'commerce.sellerSpace.overview.balanceUnavailable';
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
