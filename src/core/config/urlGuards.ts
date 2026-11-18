// Contrôles d'adresses. Les adresses http(s) littérales sont réservées à
// core/config et core/network (R-NET-1) : ce fichier est le seul endroit hors
// registre qui reconnaît le schéma d'une adresse reçue du Worker.

/** True si la valeur est une adresse https sans espace (aucun autre schéma). */
export function isHttpsUrl(value: unknown): value is string {
  return typeof value === 'string' && /^https:\/\/[^\s/][^\s]*$/i.test(value);
}

/**
 * Identifiant d'une vidéo YouTube (11 caractères) pour une adresse https de
 * youtube.com ou youtu.be, sinon null. Hôtes comparés strictement.
 */
export function parseYoutubeVideoId(value: unknown): string | null {
  if (!isHttpsUrl(value)) {
    return null;
  }
  const watch =
    /^https:\/\/(?:www\.|m\.)?youtube\.com\/watch\?(?:[^#\s]*&)?v=([A-Za-z0-9_-]{11})(?:[&#]|$)/i.exec(
      value,
    );
  if (watch) {
    return watch[1];
  }
  const short = /^https:\/\/youtu\.be\/([A-Za-z0-9_-]{11})(?:[?#/]|$)/i.exec(
    value,
  );
  return short ? short[1] : null;
}

/** Liste blanche d'origines du WebView : https uniquement (R-NET-1 : le littéral reste dans core/config). */
export const HTTPS_ORIGIN_WHITELIST: string[] = ['https://*'];
