/**
 * Règles du profil communautaire, alignées sur le site (community-profile/pseudonym.js)
 * et le Worker (rapport §3.5, §11.1). Aperçu et validation avant envoi ;
 * le serveur reste l'autorité : on affiche toujours la valeur renvoyée.
 */

export const DISPLAY_NAME_MAX_LENGTH = 80;
export const PSEUDONYM_MIN_LENGTH = 2;
export const PSEUDONYM_MAX_LENGTH = 32;

export const RESERVED_PSEUDONYMS = [
  'support', 'admin', 'administrateur', 'dsi', 'dsiacademy', 'dsi_academy',
  'moderateur', 'officiel', 'equipe', 'staff', 'system', 'systeme', 'me',
  'api', 'root', 'null', 'undefined',
];

export function normalizePseudonym(value: unknown): string {
  return String(value ?? '')
    .trim()
    .replace(/^@+/, '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, PSEUDONYM_MAX_LENGTH);
}

export function isPseudonymValid(normalized: string): boolean {
  return normalized.length >= PSEUDONYM_MIN_LENGTH;
}

export function isReservedPseudonym(normalized: string): boolean {
  return RESERVED_PSEUDONYMS.includes(normalized);
}

/** Initiales d'un nom affiché (2 lettres au plus). */
export function initialsOf(name: unknown): string {
  const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }
  const first = parts[0][0] ?? '';
  const second = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : '';
  return `${first}${second}`.toUpperCase();
}
