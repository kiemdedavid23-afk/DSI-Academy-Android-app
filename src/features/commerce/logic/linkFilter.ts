/**
 * Navigation du WebView d'accès au produit acheté : le lien du vendeur est
 * ouvert dans l'app, en https uniquement. Tout autre schéma est refusé.
 */

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
