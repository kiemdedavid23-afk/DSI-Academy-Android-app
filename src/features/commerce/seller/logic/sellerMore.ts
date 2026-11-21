/**
 * Onglet Plus (lot S8) : menu en cartes, profil de la boutique (brouillon,
 * validation, corps du PATCH), avis (répartition), gains (libellés). Aucune
 * dépendance à React ni au réseau. Jamais le texte d'erreur du Worker (D17).
 */

import type {
  SellerProfile,
  SellerProfileLimits,
  SellerProfilePatch,
  SellerReviewsPage,
} from '../../store/sellerTypes';
import type {SellerTabId} from '../components/SellerTabIcon';

// ─── Menu ────────────────────────────────────────────────────────────────

export type MoreView = 'profile' | 'reviews' | 'earnings';
export type MoreIconId =
  | SellerTabId
  | 'profile'
  | 'reviews'
  | 'earnings'
  | 'withdrawals'
  | 'quit';

export type MoreAction =
  | {kind: 'tab'; tab: Exclude<SellerTabId, 'more'>}
  | {kind: 'view'; view: MoreView}
  | {kind: 'withdrawals'};

export type MoreMenuItem = {
  /** Clé i18n sous `commerce.sellerSpace.more.items.<id>`. */
  id: 'overview' | 'products' | 'sales' | 'analytics' | 'reviews' | 'profile' | 'earnings' | 'withdrawals';
  icon: MoreIconId;
  action: MoreAction;
};

/**
 * Section « Ma boutique », dans l'ordre de la capture. « Clients » et « Litiges »
 * n'ont pas de route côté Worker : ils ne sont pas proposés (R-DATA-6).
 */
export const SHOP_MENU: readonly MoreMenuItem[] = [
  {id: 'overview', icon: 'overview', action: {kind: 'tab', tab: 'overview'}},
  {id: 'products', icon: 'products', action: {kind: 'tab', tab: 'products'}},
  {id: 'sales', icon: 'sales', action: {kind: 'tab', tab: 'sales'}},
  {id: 'analytics', icon: 'analytics', action: {kind: 'tab', tab: 'analytics'}},
  {id: 'reviews', icon: 'reviews', action: {kind: 'view', view: 'reviews'}},
];

/** Section « Mon compte vendeur ». */
export const ACCOUNT_MENU: readonly MoreMenuItem[] = [
  {id: 'profile', icon: 'profile', action: {kind: 'view', view: 'profile'}},
  {id: 'earnings', icon: 'earnings', action: {kind: 'view', view: 'earnings'}},
  {id: 'withdrawals', icon: 'withdrawals', action: {kind: 'withdrawals'}},
];

/** Prénom et nom du membre pour l'en-tête ; vide si aucun des deux. */
export function memberFullName(prenom?: string | null, nom?: string | null): string {
  return [prenom, nom]
    .map(v => v?.trim() ?? '')
    .filter(v => v !== '')
    .join(' ');
}

// ─── Profil ──────────────────────────────────────────────────────────────

export type ProfileDraft = {storeName: string; slogan: string; bio: string};

export function draftFromProfile(p: SellerProfile): ProfileDraft {
  return {storeName: p.storeName, slogan: p.slogan ?? '', bio: p.bio ?? ''};
}

export type ProfileField = keyof ProfileDraft;
export type ProfileFieldError = 'empty' | 'tooLong';
export type ProfileErrors = Partial<Record<ProfileField, ProfileFieldError>>;

/** Longueurs comptées après retrait des espaces aux extrémités. */
export function validateProfile(d: ProfileDraft, limits: SellerProfileLimits): ProfileErrors {
  const errors: ProfileErrors = {};
  const name = d.storeName.trim();
  if (name === '') {
    errors.storeName = 'empty';
  } else if (name.length > limits.storeNameMax) {
    errors.storeName = 'tooLong';
  }
  if (d.slogan.trim().length > limits.sloganMax) {
    errors.slogan = 'tooLong';
  }
  if (d.bio.trim().length > limits.bioMax) {
    errors.bio = 'tooLong';
  }
  return errors;
}

/** Seuls les champs modifiés (valeurs rognées) ; `{}` = rien à enregistrer. */
export function profilePatch(p: SellerProfile, d: ProfileDraft): SellerProfilePatch {
  const patch: SellerProfilePatch = {};
  if (d.storeName.trim() !== p.storeName) {
    patch.storeName = d.storeName.trim();
  }
  if (d.slogan.trim() !== (p.slogan ?? '')) {
    patch.slogan = d.slogan.trim();
  }
  if (d.bio.trim() !== (p.bio ?? '')) {
    patch.bio = d.bio.trim();
  }
  return patch;
}

export function hasProfileChanges(p: SellerProfile, d: ProfileDraft): boolean {
  return Object.keys(profilePatch(p, d)).length > 0;
}

type Fail = {errorKind: string; status: number | null; code?: string | null};

/** Échec d'enregistrement du profil → clé i18n. */
export function profileSaveErrorKey(f: Fail): string {
  const base = 'commerce.sellerSpace.profile.errors';
  switch (f.errorKind) {
    case 'network':
      return `${base}.network`;
    case 'unauthorized':
    case 'noProof':
      return `${base}.session`;
    case 'forbidden':
      return `${base}.forbidden`;
    case 'validation':
      return `${base}.validation`;
    default:
      return `${base}.unavailable`;
  }
}

/** Échec d'envoi du logo → clé i18n (503 `CONFIG` et 429 : indisponible). */
export function logoUploadErrorKey(f: Fail): string {
  const base = 'commerce.sellerSpace.profile.logoErrors';
  switch (f.errorKind) {
    case 'network':
      return `${base}.network`;
    case 'unauthorized':
    case 'noProof':
      return `${base}.session`;
    case 'forbidden':
      return `${base}.forbidden`;
    case 'validation':
      return f.status === 413 ? `${base}.tooLarge` : `${base}.rejected`;
    default:
      return `${base}.unavailable`;
  }
}

// ─── Avis ────────────────────────────────────────────────────────────────

export type DistributionRow = {star: 5 | 4 | 3 | 2 | 1; count: number; ratio: number};

/** Lignes de 5 à 1 ; `ratio` = part des avis (0 à 1), 0 si aucun avis. */
export function distributionRows(summary: SellerReviewsPage['summary']): DistributionRow[] {
  const stars = [5, 4, 3, 2, 1] as const;
  const total = stars.reduce((n, s) => n + summary.distribution[`${s}`], 0);
  return stars.map(star => {
    const count = summary.distribution[`${star}`];
    return {star, count, ratio: total > 0 ? count / total : 0};
  });
}

/** Note à une décimale, virgule en français ; `null` : aucun avis. */
export function formatRating(rating: number | null, lang: string): string | null {
  if (rating === null) {
    return null;
  }
  const text = (Math.round(rating * 10) / 10).toFixed(1);
  return lang.toLowerCase().startsWith('fr') ? text.replace('.', ',') : text;
}

/** Nombre d'étoiles pleines (0 à 5) pour une note d'avis. */
export function filledStars(rating: number): number {
  return Math.max(0, Math.min(5, Math.round(rating)));
}

// ─── Gains ───────────────────────────────────────────────────────────────

/** Clé i18n du type d'écriture ; type inconnu ou absent : libellé générique. */
export function ledgerTypeKey(type: string | null): string {
  const base = 'commerce.sellerSpace.earnings.type';
  return type === 'SALE_CREDIT' ? `${base}.SALE_CREDIT` : `${base}.other`;
}
