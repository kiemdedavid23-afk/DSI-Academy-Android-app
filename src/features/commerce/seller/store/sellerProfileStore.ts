/**
 * Profil de la boutique (lot S8) : `GET` et `PATCH /seller/profile`, envoi du
 * logo (`POST /seller/profile/logo`, 8 Mo max). Après un enregistrement ou un
 * nouveau logo, l'Aperçu est relu pour que la barre du haut suive. Le choix de
 * la photo passe par `pickImage` (seule porte du sélecteur, T6). Purgé à la
 * déconnexion.
 */

import {createStore} from 'zustand/vanilla';
import {
  fetchSellerProfile,
  updateSellerProfile,
  uploadSellerLogo,
} from '@core/api/endpoints/marketplace/seller/seller.api';
import {storeRegistry} from '@shared/store';
import {pickErrorKey, pickImage} from '../../store/pickImage';
import type {SellerProfile, SellerProfilePatch} from '../../store/sellerTypes';
import {logoUploadErrorKey, profileSaveErrorKey} from '../logic/sellerMore';
import {sellerOverviewStore} from './sellerOverviewStore';

export type SellerProfileState = {
  data: SellerProfile | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  saving: boolean;
  /** Clé i18n de l'échec du dernier enregistrement ; null = aucun. */
  saveErrorKey: string | null;
  uploadingLogo: boolean;
  /** Clé i18n de l'échec du dernier envoi de logo ; null = aucun. */
  logoErrorKey: string | null;
};

const INITIAL: SellerProfileState = {
  data: null,
  status: 'idle',
  error: null,
  saving: false,
  saveErrorKey: null,
  uploadingLogo: false,
  logoErrorKey: null,
};

export const sellerProfileStore = createStore<SellerProfileState>(() => INITIAL);
const set = sellerProfileStore.setState;
const get = sellerProfileStore.getState;

let generation = 0;

function refreshOverview(): void {
  void sellerOverviewStore.load({force: true});
}

export const sellerProfile = {
  async load(): Promise<void> {
    const gen = generation;
    set({status: 'loading', error: null});
    const res = await fetchSellerProfile();
    if (gen !== generation) {
      return;
    }
    if (res.kind === 'failure') {
      set({status: 'error', error: res.errorKind});
      return;
    }
    set({status: 'success', data: res.profile, error: null});
  },

  /** Renvoie true si le profil est enregistré. `{}` : rien à envoyer, vrai. */
  async save(patch: SellerProfilePatch): Promise<boolean> {
    if (get().saving) {
      return false;
    }
    if (Object.keys(patch).length === 0) {
      return true;
    }
    const gen = generation;
    set({saving: true, saveErrorKey: null});
    const res = await updateSellerProfile(patch);
    if (gen !== generation) {
      return false;
    }
    if (res.kind === 'failure') {
      set({saving: false, saveErrorKey: profileSaveErrorKey(res)});
      return false;
    }
    set({saving: false, data: res.profile, saveErrorKey: null});
    refreshOverview();
    return true;
  },

  /** Choix dans la galerie puis envoi. Annulation : aucun effet. */
  async changeLogo(): Promise<void> {
    if (get().uploadingLogo) {
      return;
    }
    const gen = generation;
    set({logoErrorKey: null});
    const picked = await pickImage('gallery');
    if (picked.kind === 'cancelled' || gen !== generation) {
      return;
    }
    if (picked.kind === 'error') {
      set({logoErrorKey: pickErrorKey(picked.reason)});
      return;
    }
    set({uploadingLogo: true});
    const form = new FormData();
    form.append('file', {
      uri: picked.image.uri,
      name: picked.image.name,
      type: picked.image.type,
    } as unknown as Blob);
    const res = await uploadSellerLogo(form);
    if (gen !== generation) {
      return;
    }
    if (res.kind === 'failure') {
      set({uploadingLogo: false, logoErrorKey: logoUploadErrorKey(res)});
      return;
    }
    const current = get().data;
    set({
      uploadingLogo: false,
      data: current ? {...current, logoUrl: res.logoUrl} : current,
    });
    refreshOverview();
  },

  clearErrors(): void {
    set({saveErrorKey: null, logoErrorKey: null});
  },

  reset(): void {
    generation += 1;
    set(INITIAL);
  },
};

storeRegistry.register({purge: sellerProfile.reset});
