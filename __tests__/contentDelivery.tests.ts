import {http} from '@core/network';
import {sessionStore} from '@core/session';
import {NetworkError} from '@core/network/errors';
import {fetchDeliveryLink} from '@core/api/endpoints/content/delivery.api';
import {mapDelivery} from '@core/api/endpoints/content/delivery.mapper';
import drive from '../contracts/content/deliver.link.drive.json';
import youtube from '../contracts/content/deliver.link.youtube.json';
import proxyToken from '../contracts/content/deliver.proxyMode.videoToken.json';
import e401 from '../contracts/content/error.401.proofExpired.json';
import e403sub from '../contracts/content/error.403.subscriptionInactive.json';
import e403na from '../contracts/content/error.403.contentNotAvailable.json';
import e404 from '../contracts/content/error.404.noCompatibleAsset.json';
import e502 from '../contracts/content/error.502.linkUnavailable.json';

jest.mock('@core/network', () => ({http: {service: jest.fn()}}));
jest.mock('@core/session', () => ({sessionStore: {getAccessProof: jest.fn()}}));
const mockGet = jest.fn();
beforeEach(() => {
  mockGet.mockReset();
  (http.service as jest.Mock).mockReturnValue({get: mockGet});
  (sessionStore.getAccessProof as jest.Mock).mockReturnValue('PROOF_TEST_NOT_REAL');
});

describe('delivery.mapper', () => {
  it('lien Drive : taille en texte convertie, mime conservé', () => {
    const r = mapDelivery(200, drive);
    expect(r.kind).toBe('success');
    if (r.kind === 'success') {
      expect(r.link).toMatchObject({
        contentId: 12,
        contentType: 'book',
        assetId: 34,
        providerId: 'google_drive',
        format: 'pdf',
        mimeType: 'application/pdf',
        sizeBytes: 2048000,
      });
    }
  });
  it('lien YouTube : sans mime ni taille', () => {
    const r = mapDelivery(200, youtube);
    expect(r.kind === 'success' && r.link).toMatchObject({providerId: 'youtube', mimeType: null, sizeBytes: null});
  });
  it('adresse non https ou absente → invalidResponse', () => {
    const http1 = {...drive, delivery: {status: 'OK', url: 'http://x.invalid/a'}};
    expect(mapDelivery(200, http1)).toMatchObject({errorKind: 'invalidResponse', code: 'INVALID_LINK'});
    const none = {...drive, delivery: {status: 'OK'}};
    expect(mapDelivery(200, none)).toMatchObject({errorKind: 'invalidResponse'});
  });
  it('forme inattendue → INVALID_DELIVERY', () => {
    expect(mapDelivery(200, {...drive, type: 'stream'})).toMatchObject({code: 'INVALID_DELIVERY'});
    expect(mapDelivery(200, {...drive, content_type: 'ebook'})).toMatchObject({code: 'INVALID_DELIVERY'});
    expect(mapDelivery(200, {...drive, status: 'ERROR'})).toMatchObject({code: 'INVALID_DELIVERY'});
  });
  it('ancien mode relais (jeton ou flux) → unsupportedMode', () => {
    expect(mapDelivery(200, proxyToken)).toMatchObject({errorKind: 'unsupportedMode', code: 'PROXY_TOKEN_RESPONSE'});
    expect(mapDelivery(200, null, 'invalid')).toMatchObject({errorKind: 'unsupportedMode', code: 'PROXY_STREAM_RESPONSE'});
  });
  it('erreurs du contrat : statut → famille, code conservé', () => {
    expect(mapDelivery(401, e401)).toMatchObject({errorKind: 'unauthorized', code: 'ACCESS_PROOF_EXPIRED'});
    expect(mapDelivery(403, e403sub)).toMatchObject({errorKind: 'forbidden', code: 'ACCESS_SUBSCRIPTION_INACTIVE'});
    expect(mapDelivery(403, e403na)).toMatchObject({errorKind: 'forbidden', code: 'CONTENT_NOT_AVAILABLE'});
    expect(mapDelivery(404, e404)).toMatchObject({errorKind: 'notFound', code: 'NO_COMPATIBLE_ASSET'});
    expect(mapDelivery(502, e502)).toMatchObject({errorKind: 'providerLink', code: 'LINK_UNAVAILABLE_FOR_PROVIDER'});
    expect(mapDelivery(500, {error: 'INTERNAL_ERROR'})).toMatchObject({errorKind: 'server'});
  });
});

describe('delivery.api', () => {
  it('GET /content/:id/deliver avec la preuve d’accès, sans intent', async () => {
    mockGet.mockResolvedValue({status: 200, ok: true, body: drive, bodyKind: 'json'});
    const r = await fetchDeliveryLink(12);
    expect(http.service).toHaveBeenCalledWith('content');
    expect(mockGet).toHaveBeenCalledWith('/content/12/deliver', {auth: 'accessProof'});
    expect(r.kind).toBe('success');
  });
  it('sans preuve d’accès : refus local, aucun appel réseau', async () => {
    (sessionStore.getAccessProof as jest.Mock).mockReturnValue(null);
    expect(await fetchDeliveryLink(12)).toMatchObject({errorKind: 'noProof', code: 'ACCESS_PROOF_MISSING'});
    expect(mockGet).not.toHaveBeenCalled();
  });
  it('id invalide et erreur réseau', async () => {
    expect(await fetchDeliveryLink(0)).toMatchObject({errorKind: 'validation'});
    mockGet.mockRejectedValue(new NetworkError());
    expect(await fetchDeliveryLink(12)).toMatchObject({errorKind: 'network'});
  });
});
