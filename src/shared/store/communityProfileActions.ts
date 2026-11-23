/**
 * Actions du profil communautaire (création, modification, photo).
 * Elles écrivent le profil renvoyé par le Worker dans communityMeStore :
 * une modification faite ici se voit partout, sans nouvel appel.
 * Seul ce fichier (avec communityMeStore) parle à l'API : les écrans appellent
 * ces fonctions et ne connaissent ni le réseau ni les codes du Worker (R-LAY-5).
 */

import {
  createCommunityProfile,
  deleteCommunityAvatar,
  updateCommunityProfile,
  updateCommunityPseudonym,
  uploadCommunityAvatar,
} from '@core/api/endpoints/community/profile.api';
import type {CommunityFailure} from '@core/api/endpoints/community/common.types';
import type {CommunityProfile} from '@core/api/endpoints/community/me.types';
import {pickAvatar} from '@core/platform/pickAvatar';
import {sessionStore} from '@core/session';
import {communityProfileErrorKey} from '../community/communityErrors';
import {communityMeStore} from './communityMeStore';

export type CommunityActionFailure = {
  ok: false;
  /** Clé de traduction du message à afficher. */
  errorKey: string;
  /** Champ du formulaire concerné ('displayName', 'pseudonym', 'file') ou null. */
  field: string | null;
  /** Une partie des modifications est déjà enregistrée (profil mis à jour). */
  partialSaved: boolean;
};

export type CommunityActionResult =
  | {ok: true; profile: CommunityProfile}
  | CommunityActionFailure;

function failureCode(f: CommunityFailure): string | null {
  if (f.code) {
    return f.code;
  }
  if (f.errorKind === 'noProof') {
    return 'ACCESS_PROOF_MISSING';
  }
  if (f.errorKind === 'network') {
    return 'NETWORK_ERROR';
  }
  return null;
}

function toFailure(code: string, field: string | null, partialSaved = false): CommunityActionFailure {
  const subscriptionActive = sessionStore.getSession()?.subscriptionActive ?? null;
  return {
    ok: false,
    errorKey: communityProfileErrorKey(code, field, subscriptionActive),
    field: code === 'CONFLICT' ? 'pseudonym' : field,
    partialSaved,
  };
}

function fromFailure(f: CommunityFailure, partialSaved = false): CommunityActionFailure {
  return toFailure(failureCode(f) ?? 'GENERIC', f.field, partialSaved);
}

/** Met le profil renvoyé par le Worker dans le store, partout à la fois. */
export function setCommunityProfile(profile: CommunityProfile): void {
  communityMeStore.api.setState({
    data: {
      userId: profile.userId,
      needsProfile: false,
      profile,
      communityStatus: profile.communityStatus,
    },
    status: 'success',
    error: null,
    updatedAt: Date.now(),
  });
}

export async function createProfile(input: {
  displayName: string;
  pseudonym?: string;
  discoverable: boolean;
}): Promise<CommunityActionResult> {
  const res = await createCommunityProfile(input);
  if (res.kind !== 'success') {
    return fromFailure(res);
  }
  setCommunityProfile(res.profile);
  return {ok: true, profile: res.profile};
}

/**
 * Modification : nom et visibilité d'abord, puis pseudonyme. Si le pseudonyme
 * est refusé, nom et visibilité déjà enregistrés sont conservés (partialSaved).
 */
export async function saveProfile(
  current: CommunityProfile,
  changes: {displayName?: string; discoverable?: boolean; pseudonym?: string},
): Promise<CommunityActionResult> {
  let latest = current;
  let savedSomething = false;
  if (changes.displayName !== undefined || changes.discoverable !== undefined) {
    const res = await updateCommunityProfile({
      displayName: changes.displayName,
      discoverable: changes.discoverable,
    });
    if (res.kind !== 'success') {
      return fromFailure(res);
    }
    latest = res.profile;
    savedSomething = true;
    setCommunityProfile(latest);
  }
  if (changes.pseudonym !== undefined) {
    const res = await updateCommunityPseudonym(changes.pseudonym);
    if (res.kind !== 'success') {
      return fromFailure(res, savedSomething);
    }
    latest = res.profile;
    setCommunityProfile(latest);
  }
  return {ok: true, profile: latest};
}

export type PickAndUploadResult = CommunityActionResult | {ok: 'cancelled'};

/** Galerie → réduction à 512 px → envoi. La réponse porte les nouvelles adresses. */
export async function pickAndUploadAvatar(): Promise<PickAndUploadResult> {
  const picked = await pickAvatar();
  if (picked.kind === 'cancelled') {
    return {ok: 'cancelled'};
  }
  if (picked.kind === 'error') {
    return toFailure(picked.code, 'file');
  }
  const res = await uploadCommunityAvatar(picked.file);
  if (res.kind !== 'success') {
    return fromFailure(res);
  }
  setCommunityProfile(res.profile);
  return {ok: true, profile: res.profile};
}

export async function removeAvatar(): Promise<CommunityActionResult> {
  const res = await deleteCommunityAvatar();
  if (res.kind !== 'success') {
    return fromFailure(res);
  }
  setCommunityProfile(res.profile);
  return {ok: true, profile: res.profile};
}

const IMAGE_REFRESH_MIN_DELAY_MS = 60_000;
let lastImageRefreshAt = 0;

/**
 * Une photo qui ne se charge plus (adresse expirée ou remplacée) : on relit le
 * profil pour obtenir des adresses neuves, au plus une fois par minute.
 */
export function refreshAfterImageError(): void {
  const now = Date.now();
  if (now - lastImageRefreshAt < IMAGE_REFRESH_MIN_DELAY_MS) {
    return;
  }
  lastImageRefreshAt = now;
  void communityMeStore.load({force: true});
}

/** « Se reconnecter » : fin de session, retour à la connexion (R-NAV-1). */
export function reconnectMember(): void {
  void sessionStore.expireSession('unauthorized');
}
