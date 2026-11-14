/**
 * Filtre de navigation WebView (R-WEB-2 / R-WEB-3).
 * - hôte site https → rester dans la WebView
 * - autre https → ouvrir hors WebView (Linking)
 * - sinon → refuser
 */

import {isSiteUrl} from './siteUrl';

export type NavigationDecision =
  | {action: 'allow'}
  | {action: 'openExternal'; url: string}
  | {action: 'deny'};

/**
 * Décide du sort d'une URL demandée par la WebView.
 * N'effectue aucun effet de bord (pas de Linking ici).
 */
export function decideNavigation(url: string): NavigationDecision {
  if (!url || typeof url !== 'string') {
    return {action: 'deny'};
  }
  const trimmed = url.trim();
  if (!trimmed || trimmed === 'about:blank') {
    return {action: 'allow'};
  }
  if (/^https:\/\/[^\s/?#@\\]+/i.test(trimmed)) {
    return isSiteUrl(trimmed)
      ? {action: 'allow'}
      : {action: 'openExternal', url: trimmed};
  }
  return {action: 'deny'};
}
