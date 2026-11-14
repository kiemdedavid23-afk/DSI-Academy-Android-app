/**
 * Parse du message de fin d'inscription (R-WEB-4).
 * Ignore silencieusement tout message invalide.
 */

import {isSiteUrl} from './siteUrl';

export type RegistrationDoneMessage = {
  type: 'dsi:registration-done';
  identifiant: string;
};

const MAX_IDENTIFIANT_LEN = 254;

function isDsiId(value: string): boolean {
  return value.toUpperCase().startsWith('DSI-');
}

/**
 * @param data — chaîne JSON reçue de la WebView
 * @param originUrl — URL de la page émettrice (doit être hôte site)
 */
export function parseRegistrationDoneMessage(
  data: string,
  originUrl: string | undefined,
): RegistrationDoneMessage | null {
  if (!originUrl || !isSiteUrl(originUrl)) {
    return null;
  }
  if (typeof data !== 'string' || data.length === 0) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(data);
  } catch {
    return null;
  }
  if (
    parsed === null ||
    typeof parsed !== 'object' ||
    Array.isArray(parsed)
  ) {
    return null;
  }
  const rec = parsed as Record<string, unknown>;
  if (rec.type !== 'dsi:registration-done') {
    return null;
  }
  if (typeof rec.identifiant !== 'string') {
    return null;
  }
  const id = rec.identifiant.trim();
  if (!id || id.length > MAX_IDENTIFIANT_LEN) {
    return null;
  }
  if (isDsiId(id)) {
    return null;
  }
  // Un jeton éventuel dans le message est ignoré (non lu).
  return {type: 'dsi:registration-done', identifiant: id};
}
