/**
 * Aides d'affichage des contenus (pures, sans design).
 * Règles de durée du site (shared/format/duration.js, validées 31/08/2026) :
 * jamais de fausse durée ; < 1 min « 0:45 » ; < 1 h « 42 min » ; sinon « 1h 05 ».
 */

import type {Content} from '../api/endpoints/content/common.types';

// Types réexportés : les écrans et composants n'importent pas core/api (R-LAY-5).
export type {Content, ContentErrorKind} from '../api/endpoints/content/common.types';
export type {Category} from '../api/endpoints/content/catalogue.types';

export function formatDuration(seconds: number | null | undefined): string | null {
  if (seconds == null || Number.isNaN(seconds)) {
    return null;
  }
  const total = Math.max(0, Math.round(seconds));
  if (total === 0) {
    return null;
  }
  if (total < 60) {
    return `0:${String(total).padStart(2, '0')}`;
  }
  if (total < 3600) {
    return `${Math.round(total / 60)} min`;
  }
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return `${hours}h ${String(minutes).padStart(2, '0')}`;
}

/** Auteur : le site lit `metadata.author` ; le contrat de test porte `auteur`. */
export function contentAuthor(content: Pick<Content, 'metadata'>): string | null {
  const m = content.metadata ?? {};
  const raw = m.author ?? m.auteur;
  return typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : null;
}

export type LevelKey = 'beginner' | 'intermediate' | 'advanced';

/**
 * Niveau → clé de libellé (houses.filters.*). Valeur inconnue : null
 * (le libellé brut n'est jamais affiché, aucun texte inventé).
 */
export function levelKey(level: string | null | undefined): LevelKey | null {
  const v = (level ?? '').trim().toLowerCase();
  if (['debutant', 'débutant', 'beginner'].includes(v)) {
    return 'beginner';
  }
  if (['intermediaire', 'intermédiaire', 'intermediate'].includes(v)) {
    return 'intermediate';
  }
  if (['avance', 'avancé', 'advanced'].includes(v)) {
    return 'advanced';
  }
  return null;
}
