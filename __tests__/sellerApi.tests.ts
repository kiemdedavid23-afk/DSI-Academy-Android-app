import {http} from '@core/network';
import {sessionStore} from '@core/session';
import {
  archiveSellerListing,
  createSellerListing,
  duplicateSellerListing,
  fetchSellerAnalytics,
  fetchSellerApplication,
  fetchSellerEarnings,
  fetchSellerListings,
  fetchSellerOrders,
  fetchSellerOverview,
  submitSellerApplication,
  submitSellerListing,
  trackVisit,
  updateSellerListing,
  updateSellerProfile,
  uploadApplicationFile,
  uploadSellerLogo,
} from '@core/api/endpoints/marketplace/seller/seller.api';
import type {SellerPeriod} from '@core/api/endpoints/marketplace/seller/seller.types';
import overview from '../contracts/marketplace/seller/overview.json';
import listings from '../contracts/marketplace/seller/listings.json';
import listingDetail from '../contracts/marketplace/seller/listing.detail.json';
import listingStatus from '../contracts/marketplace/seller/listing.status.json';
import trackOk from '../contracts/marketplace/seller/track.recorded.json';
import fileUpload from '../contracts/marketplace/seller/application.file.upload.json';
import appSubmit from '../contracts/marketplace/seller/application.submit.json';
import appNone from '../contracts/marketplace/seller/application.none.json';

jest.mock('@core/network', () => ({
  http: {service: jest.fn()},
  safeEnvelope: jest.requireActual('@core/network/envelope').safeEnvelope,
}));
jest.mock('@core/session', () => ({
  sessionStore: {getAccessProof: jest.fn()},
}));

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPatch = jest.fn();
const mockDelete = jest.fn();
const mockPostForm = jest.fn();

function res(status: number, body: unknown) {
  return Promise.resolve({
    status,
    ok: status >= 200 && status < 300,
    body,
    bodyKind: 'json' as const,
  });
}

beforeEach(() => {
  [mockGet, mockPost, mockPatch, mockDelete, mockPostForm].forEach(m =>
    m.mockReset(),
  );
  (http.service as jest.Mock).mockReturnValue({
    get: mockGet,
    post: mockPost,
    patch: mockPatch,
    delete: mockDelete,
    postForm: mockPostForm,
  });
  (sessionStore.getAccessProof as jest.Mock).mockReturnValue('proof.sig');
});

const proof = {auth: 'accessProof'};
const UUID = '6f1c0b9e-7a1d-4a7e-9b0e-2d6f5a1c9e10';

describe('Espace vendeur : garde-fous', () => {
  it('sans preuve : échec local, aucun appel réseau', async () => {
    (sessionStore.getAccessProof as jest.Mock).mockReturnValue(null);
    const r = await fetchSellerOverview();
    expect(r.kind === 'failure' && r.errorKind).toBe('noProof');
    expect(mockGet).not.toHaveBeenCalled();
  });
  it('identifiant vide refusé sans appel', async () => {
    const r = await submitSellerListing('');
    expect(r.kind === 'failure' && r.code).toBe('MISSING_ID');
    expect(mockPost).not.toHaveBeenCalled();
  });
  it('période invalide refusée sans appel', async () => {
    const r = await fetchSellerAnalytics('1y' as SellerPeriod);
    expect(r.kind === 'failure' && r.code).toBe('INVALID_PERIOD');
    expect(mockGet).not.toHaveBeenCalled();
  });
});

describe('Espace vendeur : appels', () => {
  it('statut de candidature', async () => {
    mockGet.mockReturnValue(res(200, appNone));
    const r = await fetchSellerApplication();
    expect(r.kind === 'success' && r.application.status).toBe('none');
    expect(http.service).toHaveBeenCalledWith('marketplace');
    expect(mockGet).toHaveBeenCalledWith('/api/marketplace/seller/application', proof);
  });
  it('aperçu : période par défaut 30d', async () => {
    mockGet.mockReturnValue(res(200, overview));
    const r = await fetchSellerOverview();
    expect(r.kind).toBe('success');
    expect(mockGet).toHaveBeenCalledWith('/api/marketplace/seller/overview', {
      ...proof,
      query: {period: '30d'},
    });
  });
  it('liste de produits : « all » et recherche vide ne filtrent pas, limite bornée', async () => {
    mockGet.mockReturnValue(res(200, listings));
    await fetchSellerListings({status: 'all', q: '', limit: 500});
    expect(mockGet).toHaveBeenCalledWith('/api/marketplace/seller/listings', {
      ...proof,
      query: {status: undefined, q: undefined, limit: 100, cursor: undefined},
    });
  });
  it('liste de produits : filtre brouillons, recherche et curseur', async () => {
    mockGet.mockReturnValue(res(200, listings));
    await fetchSellerListings({status: 'draft', q: 'dsi', cursor: 'abc'});
    expect(mockGet).toHaveBeenCalledWith('/api/marketplace/seller/listings', {
      ...proof,
      query: {status: 'draft', q: 'dsi', limit: 20, cursor: 'abc'},
    });
  });
  it('ventes : période « all » par défaut', async () => {
    mockGet.mockReturnValue(res(200, {success: false, error: null, code: 'FORBIDDEN', data: null}));
    const r = await fetchSellerOrders();
    expect(r.kind).toBe('failure');
    expect(mockGet).toHaveBeenCalledWith('/api/marketplace/seller/orders', {
      ...proof,
      query: {period: 'all', status: undefined, limit: 20, cursor: undefined},
    });
  });
  it('gains', async () => {
    mockGet.mockReturnValue(res(503, {success: false, error: 'x', code: 'CONFIG', data: null}));
    const r = await fetchSellerEarnings();
    expect(r.kind === 'failure' && r.code).toBe('CONFIG');
  });
});

describe('Espace vendeur : écritures', () => {
  it('profil : seuls les champs fournis partent', async () => {
    mockPatch.mockReturnValue(res(500, {success: false, error: null, code: null, data: null}));
    await updateSellerProfile({slogan: 'Nouveau'});
    expect(mockPatch).toHaveBeenCalledWith(
      '/api/marketplace/seller/profile',
      {slogan: 'Nouveau'},
      proof,
    );
  });
  it('profil : nom vide ou patch vide refusés sans appel', async () => {
    const a = await updateSellerProfile({storeName: '  '});
    const b = await updateSellerProfile({});
    expect(a.kind === 'failure' && a.code).toBe('EMPTY_STORE_NAME');
    expect(b.kind === 'failure' && b.code).toBe('EMPTY_PATCH');
    expect(mockPatch).not.toHaveBeenCalled();
  });
  it('logo : envoyé en multipart', async () => {
    mockPostForm.mockReturnValue(res(500, {success: false, error: null, code: null, data: null}));
    const form = {} as FormData;
    await uploadSellerLogo(form);
    expect(mockPostForm).toHaveBeenCalledWith(
      '/api/marketplace/seller/profile/logo',
      form,
      proof,
    );
  });
  it('création : champs obligatoires et prix entier ≥ 0', async () => {
    const a = await createSellerListing({title: 'x'});
    const b = await createSellerListing({
      title: 'x',
      description: 'd',
      category: 'tools',
      deliveryUrl: 'https://a.invalid',
      priceDsi: -1,
    });
    expect(a.kind === 'failure' && a.code).toBe('MISSING_FIELD');
    expect(b.kind === 'failure' && b.code).toBe('INVALID_PRICE');
    expect(mockPost).not.toHaveBeenCalled();
  });
  it('création : prix 0 accepté (gratuit), brouillon', async () => {
    mockPost.mockReturnValue(res(201, listingDetail));
    const input = {
      title: 'x',
      description: 'd',
      category: 'tools',
      deliveryUrl: 'https://a.invalid',
      priceDsi: 0,
      status: 'draft' as const,
    };
    const r = await createSellerListing(input);
    expect(r.kind).toBe('success');
    expect(mockPost).toHaveBeenCalledWith('/api/marketplace/seller/listings', input, proof);
  });
  it('modification : prix 0 envoyé, image devient coverFileId, status jamais envoyé', async () => {
    mockPatch.mockReturnValue(res(200, listingDetail));
    await updateSellerListing('lst_1', {
      priceDsi: 0,
      imageFileId: 'f_9',
      status: 'draft',
    });
    expect(mockPatch).toHaveBeenCalledWith(
      '/api/marketplace/seller/listings/lst_1',
      {priceDsi: 0, coverFileId: 'f_9'},
      proof,
    );
  });
  it('soumission, duplication, archivage : bonnes routes', async () => {
    mockPost.mockReturnValue(res(200, listingStatus));
    await submitSellerListing('lst_1');
    expect(mockPost).toHaveBeenCalledWith(
      '/api/marketplace/seller/listings/lst_1/submit',
      {},
      proof,
    );
    mockPost.mockReturnValue(res(201, listingDetail));
    await duplicateSellerListing('lst_1');
    expect(mockPost).toHaveBeenCalledWith(
      '/api/marketplace/seller/listings/lst_1/duplicate',
      {},
      proof,
    );
    mockDelete.mockReturnValue(res(200, {success: true, error: null, code: null, data: {id: 'lst_1', status: 'archived'}}));
    const r = await archiveSellerListing('lst_1');
    expect(r.kind === 'success' && r.status).toBe('archived');
    expect(mockDelete).toHaveBeenCalledWith('/api/marketplace/seller/listings/lst_1', proof);
  });
});

describe('Suivi des visites', () => {
  it('route publique : sans preuve, corps exact', async () => {
    (sessionStore.getAccessProof as jest.Mock).mockReturnValue(null);
    mockPost.mockReturnValue(res(200, trackOk));
    const r = await trackVisit('listing_view', 'lst_1', UUID);
    expect(r.kind).toBe('success');
    expect(mockPost).toHaveBeenCalledWith(
      '/api/marketplace/track',
      {kind: 'listing_view', targetId: 'lst_1', visitorKey: UUID},
      {auth: 'none'},
    );
  });
  it('clé visiteur invalide : rien n’est envoyé', async () => {
    const r = await trackVisit('store_view', 'ma-boutique', 'pas-un-uuid');
    expect(r.kind === 'failure' && r.code).toBe('INVALID_VISITOR_KEY');
    expect(mockPost).not.toHaveBeenCalled();
  });
  it('ne lève jamais, même si le réseau plante', async () => {
    mockPost.mockImplementation(() => {
      throw new Error('boom');
    });
    const r = await trackVisit('store_view', 'ma-boutique', UUID);
    expect(r.kind).toBe('failure');
  });
});

describe('Candidature : fichiers et dépôt', () => {
  const input = {
    storeName: 'Ma boutique',
    slogan: 'Un slogan',
    description: 'Une description',
    logoFileId: 'f1',
    idDocumentFrontFileId: 'f2',
    idDocumentBackFileId: 'f3',
    idSelfieFileId: 'f4',
  };

  it('envoie un fichier par postForm avec la preuve', async () => {
    mockPostForm.mockReturnValue(res(201, fileUpload));
    const form = new FormData();
    const r = await uploadApplicationFile(form);
    expect(mockPostForm).toHaveBeenCalledWith(
      '/api/marketplace/seller/application/files',
      form,
      proof,
    );
    expect(r.kind === 'success' && r.fileId).toBe('fil_9a8b7c6d5e4f');
    expect(r.kind === 'success' && r.fileKind).toBe('id_front');
  });

  it('refuse sans preuve, sans appel', async () => {
    (sessionStore.getAccessProof as jest.Mock).mockReturnValue(null);
    const r = await uploadApplicationFile(new FormData());
    expect(r.kind === 'failure' && r.errorKind).toBe('noProof');
    expect(mockPostForm).not.toHaveBeenCalled();
  });

  it('dépose la candidature', async () => {
    mockPost.mockReturnValue(res(201, appSubmit));
    const r = await submitSellerApplication(input);
    expect(mockPost).toHaveBeenCalledWith(
      '/api/marketplace/seller/application',
      input,
      proof,
    );
    expect(r.kind === 'success' && r.receipt.status).toBe('PENDING');
  });

  it('refuse un champ ou un fichier manquant, sans appel', async () => {
    const r = await submitSellerApplication({...input, idSelfieFileId: ''});
    expect(r.kind === 'failure' && r.errorKind).toBe('validation');
    const r2 = await submitSellerApplication({...input, slogan: '  '});
    expect(r2.kind === 'failure' && r2.errorKind).toBe('validation');
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('409 : conflit ; réponse sans PENDING : invalidResponse', async () => {
    mockPost.mockReturnValue(
      res(409, {success: false, error: 'x', code: 'CONFLICT', data: null}),
    );
    const r = await submitSellerApplication(input);
    expect(r.kind === 'failure' && r.errorKind).toBe('conflict');
    mockPost.mockReturnValue(
      res(200, {success: true, error: null, code: null, data: {status: 'APPROVED'}}),
    );
    const r2 = await submitSellerApplication(input);
    expect(r2.kind === 'failure' && r2.errorKind).toBe('invalidResponse');
  });
});
