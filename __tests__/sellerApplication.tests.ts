jest.mock('@core/api/endpoints/marketplace/seller/seller.api', () => ({
  fetchSellerApplication: jest.fn(),
  uploadApplicationFile: jest.fn(),
  submitSellerApplication: jest.fn(),
}));
jest.mock('@shared/store', () => ({
  storeRegistry: {register: jest.fn()},
}));
jest.mock('../src/features/commerce/logic/pickImage', () => ({
  pickImage: jest.fn(),
  pickErrorKey: (r: string) => `pick.${r}`,
}));

import {
  fetchSellerApplication,
  submitSellerApplication,
  uploadApplicationFile,
} from '@core/api/endpoints/marketplace/seller/seller.api';
import {
  emptyDraft,
  emptySlots,
  isApplicationComplete,
  isStepValid,
  submitErrorKey,
  uploadErrorKey,
} from '../src/features/commerce/logic/applicationDraft';
import {pickImage} from '../src/features/commerce/logic/pickImage';
import {sellerApplicationStore as store} from '../src/features/commerce/store/sellerApplicationStore';

const fetchApp = fetchSellerApplication as jest.Mock;
const upload = uploadApplicationFile as jest.Mock;
const submit = submitSellerApplication as jest.Mock;
const pick = pickImage as jest.Mock;

const image = {uri: 'file:///p.jpg', name: 'p.jpg', type: 'image/jpeg', size: 1000};
const fail = (errorKind: string, status: number | null = null) => ({
  kind: 'failure',
  errorKind,
  status,
  code: null,
});

beforeEach(() => {
  store.reset();
  [fetchApp, upload, submit, pick].forEach(m => m.mockReset());
});

async function fillAll() {
  store.setField('storeName', 'Ma boutique');
  store.setField('slogan', 'Un slogan');
  store.setField('description', 'Une description');
  pick.mockResolvedValue({kind: 'picked', image});
  for (const kind of ['logo', 'id_front', 'id_back', 'id_selfie'] as const) {
    upload.mockResolvedValueOnce({kind: 'success', fileId: `f_${kind}`, fileKind: kind});
    await store.pickAndUpload(kind, 'gallery');
  }
}

describe('Candidature : règles des étapes', () => {
  it('valide nom + slogan, description, puis chaque photo', () => {
    const slots = emptySlots();
    const d = {...emptyDraft(), storeName: 'A', slogan: 'B'};
    expect(isStepValid(1, d, slots)).toBe(true);
    expect(isStepValid(1, {...d, slogan: ' '}, slots)).toBe(false);
    expect(isStepValid(1, {...d, storeName: 'x'.repeat(81)}, slots)).toBe(false);
    expect(isStepValid(2, d, slots)).toBe(false);
    expect(isStepValid(2, {...d, description: 'x'.repeat(2000)}, slots)).toBe(true);
    expect(isStepValid(2, {...d, description: 'x'.repeat(2001)}, slots)).toBe(false);
    expect(isStepValid(3, d, slots)).toBe(false);
    expect(isStepValid(6, d, slots)).toBe(true);
    expect(isApplicationComplete(d, slots)).toBe(false);
  });

  it('clés de message : jamais le texte du Worker', () => {
    expect(uploadErrorKey({errorKind: 'unavailable', status: 429})).toBe('mp.apply.uploadErrors.busy');
    expect(uploadErrorKey({errorKind: 'unavailable', status: 503})).toBe('mp.apply.uploadErrors.unavailable');
    expect(uploadErrorKey({errorKind: 'validation', status: 413})).toBe('mp.apply.uploadErrors.tooLarge');
    expect(uploadErrorKey({errorKind: 'validation', status: 422})).toBe('mp.apply.uploadErrors.rejected');
    expect(uploadErrorKey({errorKind: 'noProof', status: null})).toBe('mp.apply.uploadErrors.session');
    expect(submitErrorKey({errorKind: 'conflict', status: 409})).toBe('mp.apply.submitErrors.conflict');
    expect(submitErrorKey({errorKind: 'network', status: null})).toBe('mp.apply.submitErrors.network');
  });
});

describe('Candidature : store', () => {
  it('lit le statut', async () => {
    fetchApp.mockResolvedValue({
      kind: 'success',
      application: {status: 'none', reason: null, storeName: null, slogan: null, description: null, submittedAt: null, reviewedAt: null},
    });
    await store.load();
    expect(store.getState().status).toBe('success');
    expect(store.getState().application?.status).toBe('none');
  });

  it('échec de lecture : erreur, pas de statut inventé', async () => {
    fetchApp.mockResolvedValue(fail('network'));
    await store.load();
    expect(store.getState().status).toBe('error');
    expect(store.getState().application).toBeNull();
  });

  it('refusée : préremplit le texte, jamais les pièces', async () => {
    fetchApp.mockResolvedValue({
      kind: 'success',
      application: {status: 'REJECTED', reason: 'Logo flou', storeName: 'Ancienne', slogan: 'S', description: 'D', submittedAt: 1, reviewedAt: 2},
    });
    await store.load();
    expect(store.getState().draft.storeName).toBe('Ancienne');
    expect(store.getState().slots.id_front.status).toBe('idle');
  });

  it('envoie une photo choisie et garde l’identifiant', async () => {
    pick.mockResolvedValue({kind: 'picked', image});
    upload.mockResolvedValue({kind: 'success', fileId: 'fil_1', fileKind: 'logo'});
    await store.pickAndUpload('logo', 'gallery');
    const slot = store.getState().slots.logo;
    expect(slot).toMatchObject({status: 'done', fileId: 'fil_1', uri: image.uri});
    expect(upload).toHaveBeenCalledTimes(1);
  });

  it('annulation : rien ne change ; photo refusée : erreur sans envoi', async () => {
    pick.mockResolvedValue({kind: 'cancelled'});
    await store.pickAndUpload('logo', 'camera');
    expect(store.getState().slots.logo.status).toBe('idle');
    pick.mockResolvedValue({kind: 'error', reason: 'notImage'});
    await store.pickAndUpload('logo', 'camera');
    expect(store.getState().slots.logo).toMatchObject({status: 'error', errorKey: 'pick.notImage'});
    expect(upload).not.toHaveBeenCalled();
  });

  it('échec d’envoi : message en clé, nouvel essai possible', async () => {
    pick.mockResolvedValue({kind: 'picked', image});
    upload.mockResolvedValueOnce(fail('unavailable', 429));
    await store.pickAndUpload('id_back', 'gallery');
    expect(store.getState().slots.id_back).toMatchObject({status: 'error', errorKey: 'mp.apply.uploadErrors.busy'});
    upload.mockResolvedValueOnce({kind: 'success', fileId: 'fil_2', fileKind: 'id_back'});
    await store.pickAndUpload('id_back', 'gallery');
    expect(store.getState().slots.id_back.status).toBe('done');
  });

  it('dépose avec les quatre identifiants puis efface saisie et photos', async () => {
    await fillAll();
    submit.mockResolvedValue({kind: 'success', receipt: {status: 'PENDING', submittedAt: 5}});
    expect(await store.submit()).toBe(true);
    expect(submit).toHaveBeenCalledWith({
      storeName: 'Ma boutique',
      slogan: 'Un slogan',
      description: 'Une description',
      logoFileId: 'f_logo',
      idDocumentFrontFileId: 'f_id_front',
      idDocumentBackFileId: 'f_id_back',
      idSelfieFileId: 'f_id_selfie',
    });
    const s = store.getState();
    expect(s.application?.status).toBe('PENDING');
    expect(s.slots.id_front.uri).toBeNull();
    expect(s.draft.storeName).toBe('');
  });

  it('dossier incomplet : aucun dépôt', async () => {
    store.setField('storeName', 'X');
    expect(await store.submit()).toBe(false);
    expect(submit).not.toHaveBeenCalled();
  });

  it('conflit au dépôt : erreur lisible, dossier conservé', async () => {
    await fillAll();
    submit.mockResolvedValue(fail('conflict', 409));
    expect(await store.submit()).toBe(false);
    const s = store.getState();
    expect(s.submitStatus).toBe('error');
    expect(s.submitErrorKey).toBe('mp.apply.submitErrors.conflict');
    expect(s.slots.logo.fileId).toBe('f_logo');
  });

  it('quitter le formulaire efface tout', async () => {
    await fillAll();
    store.discardDraft();
    expect(store.getState().draft).toEqual(emptyDraft());
    expect(store.getState().slots).toEqual(emptySlots());
  });
});
