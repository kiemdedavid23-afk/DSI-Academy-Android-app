/**
 * Navigation du WebView d'accès au produit acheté : le lien du vendeur est
 * ouvert dans l'app, en https uniquement. Tout autre schéma est refusé.
 */

import {HTTPS_ORIGIN_WHITELIST} from '@core/config/urlGuards';

/** Liste blanche d'origines du WebView (https uniquement), relayée depuis core/config (R-LAY-5). */
export {HTTPS_ORIGIN_WHITELIST};

export function isAllowedLinkUrl(url: unknown): boolean {
  if (typeof url !== 'string') {
    return false;
  }
  const trimmed = url.trim();
  if (trimmed === 'about:blank') {
    return true;
  }
  return /^https:\/\/[^\s/?#@\\]+/i.test(trimmed);
}
