/**
 * Candidature vendeur (lot S3) : statut lu au Worker, saisie du dossier,
 * envoi des quatre fichiers puis dépôt. Les écrans ne parlent qu'à ce store
 * (R-LAY-5). Rien n'est conservé hors ligne : ni saisie ni photos (pièces
 * d'identité). Chaque purge de session vide tout.
 */

import {
  fetchSellerApplication,
  submitSellerApplication,
  uploadApplicationFile,
} from '@core/api/endpoints/marketplace/seller/seller.api';
import type {
  ApplicationFileKind,
  SellerApplication,
} from '@core/api/endpoints/marketplace/seller/seller.types';
import {storeRegistry} from '@shared/store';
import {
  emptyDraft,
  emptySlot,
  emptySlots,
  isApplicationComplete,
  isUploading,
  submitErrorKey,
  uploadErrorKey,
  type ApplicationDraft,
  type ApplicationSlots,
} from '../logic/applicationDraft';
import {pickErrorKey, pickImage, type PickSource} from '../logic/pickImage';
import type {CommerceErrorKind} from './commerceTypes';
import type {LoadStatus} from './commerceStores';
import {createSimpleStore} from './simpleStore';

export type SellerApplicationState = {
  status: LoadStatus;
  errorKind: CommerceErrorKind | null;
  application: SellerApplication | null;
  draft: ApplicationDraft;
  slots: ApplicationSlots;
  submitStatus: 'idle' | 'sending' | 'error';
  submitErrorKey: string | null;
};

const initial = (): SellerApplicationState => ({
  status: 'idle',
  errorKind: null,
  application: null,
  draft: emptyDraft(),
  slots: emptySlots(),
  submitStatus: 'idle',
  submitErrorKey: null,
});

function createSellerApplicationStore() {
  const store = createSimpleStore<SellerApplicationState>(initial());
  let generation = 0;

  const setSlot = (
    kind: ApplicationFileKind,
    patch: Partial<SellerApplicationState['slots'][ApplicationFileKind]>,
  ) => {
    const s = store.getState();
    store.setState({slots: {...s.slots, [kind]: {...s.slots[kind], ...patch}}});
  };

  const self = {
    getState: store.getState,
    subscribe: store.subscribe,

    /** Relit le statut (à chaque ouverture de la section Vendeur). */
    load: async () => {
      if (store.getState().status === 'loading') {
        return;
      }
      generation += 1;
      const mine = generation;
      store.setState({status: 'loading', errorKind: null});
      const res = await fetchSellerApplication();
      if (mine !== generation) {
        return;
      }
      if (res.kind === 'failure') {
        store.setState({status: 'error', errorKind: res.errorKind});
        return;
      }
      const s = store.getState();
      const a = res.application;
      // Redépôt : on préremplit le texte, jamais les pièces.
      const prefill =
        (a.status === 'REJECTED' || a.status === 'SUSPENDED') &&
        s.draft.storeName === '' &&
        s.draft.slogan === '' &&
        s.draft.description === '';
      store.setState({
        status: 'success',
        application: a,
        draft: prefill
          ? {
              storeName: a.storeName ?? '',
              slogan: a.slogan ?? '',
              description: a.description ?? '',
            }
          : s.draft,
      });
    },

    setField: (field: keyof ApplicationDraft, value: string) => {
      store.setState({draft: {...store.getState().draft, [field]: value}});
    },

    /** Choisit une photo puis l'envoie tout de suite (un envoi par fichier). */
    pickAndUpload: async (
      kind: ApplicationFileKind,
      source: PickSource,
    ): Promise<void> => {
      if (store.getState().slots[kind].status === 'uploading') {
        return;
      }
      const picked = await pickImage(source, {
        frontCamera: kind === 'id_selfie',
      });
      if (picked.kind === 'cancelled') {
        return;
      }
      if (picked.kind === 'error') {
        setSlot(kind, {status: 'error', errorKey: pickErrorKey(picked.reason)});
        return;
      }
      setSlot(kind, {
        status: 'uploading',
        uri: picked.image.uri,
        fileId: null,
        errorKey: null,
      });
      await self.upload(kind, picked.image);
    },

    upload: async (
      kind: ApplicationFileKind,
      image: {uri: string; name: string; type: string},
    ): Promise<void> => {
      const form = new FormData();
      form.append('file', {
        uri: image.uri,
        name: image.name,
        type: image.type,
      } as unknown as Blob);
      form.append('kind', kind);
      const res = await uploadApplicationFile(form);
      if (res.kind === 'failure') {
        setSlot(kind, {status: 'error', errorKey: uploadErrorKey(res)});
        return;
      }
      setSlot(kind, {status: 'done', fileId: res.fileId, errorKey: null});
    },

    clearSlot: (kind: ApplicationFileKind) => setSlot(kind, emptySlot()),

    /** Dépôt. Renvoie true si le Worker a répondu PENDING. */
    submit: async (): Promise<boolean> => {
      const s = store.getState();
      if (
        s.submitStatus === 'sending' ||
        isUploading(s.slots) ||
        !isApplicationComplete(s.draft, s.slots)
      ) {
        return false;
      }
      store.setState({submitStatus: 'sending', submitErrorKey: null});
      const res = await submitSellerApplication({
        storeName: s.draft.storeName.trim(),
        slogan: s.draft.slogan.trim(),
        description: s.draft.description.trim(),
        logoFileId: s.slots.logo.fileId ?? '',
        idDocumentFrontFileId: s.slots.id_front.fileId ?? '',
        idDocumentBackFileId: s.slots.id_back.fileId ?? '',
        idSelfieFileId: s.slots.id_selfie.fileId ?? '',
      });
      if (res.kind === 'failure') {
        store.setState({
          submitStatus: 'error',
          submitErrorKey: submitErrorKey(res),
        });
        return false;
      }
      store.setState({
        submitStatus: 'idle',
        application: {
          status: 'PENDING',
          reason: null,
          storeName: s.draft.storeName.trim(),
          slogan: s.draft.slogan.trim(),
          description: s.draft.description.trim(),
          submittedAt: res.receipt.submittedAt,
          reviewedAt: null,
        },
        draft: emptyDraft(),
        slots: emptySlots(),
      });
      return true;
    },

    /** Quitte le formulaire : saisie et photos effacées. */
    discardDraft: () => {
      store.setState({
        draft: emptyDraft(),
        slots: emptySlots(),
        submitStatus: 'idle',
        submitErrorKey: null,
      });
    },

    reset: () => {
      generation += 1;
      store.replace(initial());
    },
    purge: () => self.reset(),
  };
  storeRegistry.register(self);
  return self;
}

export const sellerApplicationStore = createSellerApplicationStore();
