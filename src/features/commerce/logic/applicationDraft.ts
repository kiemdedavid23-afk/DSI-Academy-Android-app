/**
 * Candidature vendeur : étapes, règles de validation et clés de messages.
 * Logique pure, sans écran ni réseau. Les textes viennent de mp.apply.*.
 */

import {
  APPLICATION_LIMITS,
  type ApplicationFileKind,
} from '@core/api/endpoints/marketplace/seller/seller.types';
import type {CommerceErrorKind} from '../store/commerceTypes';

export const APPLY_STEPS = 6;

export type ApplicationDraft = {
  storeName: string;
  slogan: string;
  description: string;
};

export type SlotStatus = 'idle' | 'uploading' | 'done' | 'error';

export type ApplicationSlot = {
  status: SlotStatus;
  uri: string | null;
  fileId: string | null;
  errorKey: string | null;
};

export type ApplicationSlots = Record<ApplicationFileKind, ApplicationSlot>;

export const emptySlot = (): ApplicationSlot => ({
  status: 'idle',
  uri: null,
  fileId: null,
  errorKey: null,
});

export const emptySlots = (): ApplicationSlots => ({
  logo: emptySlot(),
  id_front: emptySlot(),
  id_back: emptySlot(),
  id_selfie: emptySlot(),
});

export const emptyDraft = (): ApplicationDraft => ({
  storeName: '',
  slogan: '',
  description: '',
});

const filled = (s: string, max: number) =>
  s.trim().length > 0 && s.trim().length <= max;

/** Étape 1 : nom et slogan ; 2 : description ; 3 : logo ; 4 : recto + verso ; 5 : selfie ; 6 : relecture. */
export function isStepValid(
  step: number,
  draft: ApplicationDraft,
  slots: ApplicationSlots,
): boolean {
  switch (step) {
    case 1:
      return (
        filled(draft.storeName, APPLICATION_LIMITS.storeName) &&
        filled(draft.slogan, APPLICATION_LIMITS.slogan)
      );
    case 2:
      return filled(draft.description, APPLICATION_LIMITS.description);
    case 3:
      return slots.logo.status === 'done';
    case 4:
      return slots.id_front.status === 'done' && slots.id_back.status === 'done';
    case 5:
      return slots.id_selfie.status === 'done';
    default:
      return true;
  }
}

export function isApplicationComplete(
  draft: ApplicationDraft,
  slots: ApplicationSlots,
): boolean {
  return [1, 2, 3, 4, 5].every(step => isStepValid(step, draft, slots));
}

export function isUploading(slots: ApplicationSlots): boolean {
  return Object.values(slots).some(s => s.status === 'uploading');
}

type Fail = {errorKind: CommerceErrorKind; status: number | null};

/** Échec d'envoi d'un fichier → clé i18n (jamais le texte du Worker). */
export function uploadErrorKey(f: Fail): string {
  const base = 'mp.apply.uploadErrors';
  switch (f.errorKind) {
    case 'network':
      return `${base}.network`;
    case 'unauthorized':
    case 'noProof':
      return `${base}.session`;
    case 'unavailable':
      return f.status === 429 ? `${base}.busy` : `${base}.unavailable`;
    case 'validation':
      return f.status === 413 ? `${base}.tooLarge` : `${base}.rejected`;
    case 'server':
    case 'upstream':
      return `${base}.unavailable`;
    default:
      return `${base}.unknown`;
  }
}

/** Échec du dépôt → clé i18n. */
export function submitErrorKey(f: Fail): string {
  const base = 'mp.apply.submitErrors';
  switch (f.errorKind) {
    case 'network':
      return `${base}.network`;
    case 'unauthorized':
    case 'noProof':
      return `${base}.session`;
    case 'conflict':
      return `${base}.conflict`;
    case 'validation':
      return `${base}.invalid`;
    case 'unavailable':
    case 'server':
    case 'upstream':
      return `${base}.unavailable`;
    default:
      return `${base}.unknown`;
  }
}
