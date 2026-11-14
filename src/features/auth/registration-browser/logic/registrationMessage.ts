/**
 * Parse du message de fin d'inscription (R-WEB-4 + AJOUT L1b).
 * Accepté dès que : JSON valide, type exact, origine hôte site.
 * identifiant facultatif ; reason et autres champs ignorés.
 */

import {isSiteUrl} from './siteUrl';

export type RegistrationDoneMessage = {
  type: 'dsi:registration-done';
  /** Présent seulement s'il est valide (non vide, ≤ 254, pas DSI-). */
  identifiant: string | null;
};

const MAX_IDENTIFIANT_LEN = 254;

function isDsiId(value: string): boolean {
  return value.toUpperCase().startsWith('DSI-');
}

function normalizeIdentifiant(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const id = value.trim();
  if (!id || id.length > MAX_IDENTIFIANT_LEN) {
    return null;
  }
  if (isDsiId(id)) {
    return null;
  }
  return id;
}

/**
 * @returns message accepté, ou null si rejeté (mauvais type / origine / JSON).
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
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }
  const rec = parsed as Record<string, unknown>;
  if (rec.type !== 'dsi:registration-done') {
    return null;
  }
  // reason et tout autre champ : ignorés volontairement.
  return {
    type: 'dsi:registration-done',
    identifiant: normalizeIdentifiant(rec.identifiant),
  };
}
