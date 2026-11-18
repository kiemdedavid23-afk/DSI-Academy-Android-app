import {http} from '@core/network';
import {sessionStore} from '@core/session';
import {
  fetchMarketplaceReviews,
  fetchMarketplaceSeller,
  fetchMarketplaceSellers,
  fetchMarketplaceTrending,
  postMarketplaceReview,
} from '@core/api/endpoints/marketplace/marketplace.api';
import {MARKETPLACE_STORES} from '../src/features/commerce/store/marketplaceStores';
import {reviewErrorKey, starsText} from '../src/features/commerce/components/MarketplaceReviews';
import trending from '../contracts/marketplace/trending.json';
import sellers from '../contracts/marketplace/sellers.json';
import seller from '../contracts/marketplace/seller.json';
import reviews from '../contracts/marketplace/reviews.json';
import reviewCreated from '../contracts/marketplace/review.create.json';
import reviewForbidden from '../contracts/marketplace/error.403.reviewForbidden.json';
import reviewConflict from '../contracts/marketplace/error.409.reviewConflict.json';

jest.mock('@core/network', () => ({
  http: {service: jest.fn()},
  safeEnvelope: jest.requireActual('@core/network/envelope').safeEnvelope,
}));
jest.mock('@core/session', () => ({
  sessionStore: {getAccessProof: jest.fn()},
}));

const mockGet = jest.fn();
const mockPost = jest.fn();

function res(status: number, body: unknown) {
  return Promise.resolve({
    status,
    ok: status >= 200 && status < 300,
    body,
    bodyKind: 'json' as const,
  });
}

beforeEach(() => {
  mockGet.mockReset();
  mockPost.mockReset();
  (http.service as jest.Mock).mockReturnValue({get: mockGet, post: mockPost});
  (sessionStore.getAccessProof as jest.Mock).mockReturnValue('proof.sig');
  Object.values(MARKETPLACE_STORES).forEach(s => s.reset());
});

describe('tendances', () => {
  it('garde l’ordre reçu et écarte les produits PRIVATE', async () => {
    mockGet.mockReturnValue(res(200, trending));
    const r = await fetchMarketplaceTrending();
    expect(mockGet).toHaveBeenCalledWith(
      '/api/marketplace/trending',
      expect.objectContaining({auth: 'none'}),
    );
    if (r.kind !== 'success') {
      throw new Error('succès attendu');
    }
    expect(r.items.map(p => p.id)).toEqual([
      'lst_a1b2c3d4e5f6',
      'lst_b2c3d4e5f6a1',
    ]);
  });

  it('le store passe en erreur sur un 503 puis se recharge', async () => {
    mockGet.mockReturnValueOnce(res(503, {success: false, error: 'x', code: 'UNAVAILABLE', data: null}));
    await MARKETPLACE_STORES.trending.load();
    expect(MARKETPLACE_STORES.trending.getState().status).toBe('error');
    expect(MARKETPLACE_STORES.trending.getState().errorKind).toBe('unavailable');
    mockGet.mockReturnValueOnce(res(200, trending));
    await MARKETPLACE_STORES.trending.load({force: true});
    expect(MARKETPLACE_STORES.trending.getState().items).toHaveLength(2);
  });
});

describe('vendeurs', () => {
  it('liste : écarte une ligne sans identifiant', async () => {
    mockGet.mockReturnValue(res(200, sellers));
    const r = await fetchMarketplaceSellers();
    if (r.kind !== 'success') {
      throw new Error('succès attendu');
    }
    expect(r.sellers).toHaveLength(1);
    expect(r.sellers[0]).toMatchObject({memberId: 'u_77', productsCount: 3, rating: 4.5});
  });

  it('boutique : produits PRIVATE écartés, nom de boutique repris', async () => {
    mockGet.mockReturnValue(res(200, seller));
    const r = await fetchMarketplaceSeller('u_77');
    if (r.kind !== 'success') {
      throw new Error('succès attendu');
    }
    expect(r.products).toHaveLength(1);
    expect(r.products[0].storeName).toBe('Atelier Awa');
  });

  it('boutique : 404 devient notFound ; identifiant vide refusé sans appel', async () => {
    mockGet.mockReturnValue(res(404, {success: false, error: 'x', code: 'NOT_FOUND', data: null}));
    const r = await fetchMarketplaceSeller('u_x');
    expect(r).toMatchObject({kind: 'failure', errorKind: 'notFound'});
    mockGet.mockClear();
    const empty = await fetchMarketplaceSeller('');
    expect(empty).toMatchObject({kind: 'failure', errorKind: 'validation'});
    expect(mockGet).not.toHaveBeenCalled();
  });
});

describe('avis', () => {
  it('lecture : note hors 1..5 ignorée, plus récent d’abord', async () => {
    mockGet.mockReturnValue(res(200, reviews));
    const r = await fetchMarketplaceReviews('lst_a1b2c3d4e5f6');
    if (r.kind !== 'success') {
      throw new Error('succès attendu');
    }
    expect(r.reviews.map(x => x.id)).toEqual(['rev_2', 'rev_1']);
    expect(r.reviews[0].comment).toBeNull();
  });

  it('envoi : corps minimal, preuve d’accès, commentaire vide omis', async () => {
    mockPost.mockReturnValue(res(201, reviewCreated));
    const r = await postMarketplaceReview('lst_a1b2c3d4e5f6', 5, '   ');
    expect(r.kind).toBe('success');
    expect(mockPost).toHaveBeenCalledWith(
      '/api/marketplace/listings/lst_a1b2c3d4e5f6/reviews',
      {rating: 5},
      expect.objectContaining({auth: 'accessProof'}),
    );
  });

  it('envoi : refus locaux sans appel réseau', async () => {
    expect(await postMarketplaceReview('lst_1', 0, '')).toMatchObject({errorKind: 'validation'});
    expect(await postMarketplaceReview('lst_1', 3.5, '')).toMatchObject({errorKind: 'validation'});
    expect(await postMarketplaceReview('lst_1', 4, 'a'.repeat(2001))).toMatchObject({errorKind: 'validation'});
    (sessionStore.getAccessProof as jest.Mock).mockReturnValue(null);
    expect(await postMarketplaceReview('lst_1', 4, '')).toMatchObject({errorKind: 'noProof'});
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('403 = pas acheteur, 409 = déjà noté', async () => {
    mockPost.mockReturnValueOnce(res(403, reviewForbidden));
    expect(await postMarketplaceReview('lst_1', 4, '')).toMatchObject({errorKind: 'forbidden'});
    mockPost.mockReturnValueOnce(res(409, reviewConflict));
    expect(await postMarketplaceReview('lst_1', 4, '')).toMatchObject({errorKind: 'conflict'});
    expect(reviewErrorKey('forbidden')).toBe('commerce.reviewForm.errors.forbidden');
    expect(reviewErrorKey('conflict')).toBe('commerce.reviewForm.errors.conflict');
  });

  it('le store relit les avis après un envoi réussi, sans double envoi', async () => {
    mockGet.mockReturnValue(res(200, reviews));
    mockPost.mockReturnValue(res(201, reviewCreated));
    const first = MARKETPLACE_STORES.reviews.submit('lst_a1b2c3d4e5f6', 5, 'Bien');
    const second = await MARKETPLACE_STORES.reviews.submit('lst_a1b2c3d4e5f6', 5, 'Bien');
    expect(second).toEqual({ok: false, errorKind: 'conflict'});
    expect(await first).toEqual({ok: true});
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(MARKETPLACE_STORES.reviews.getState().reviews).toHaveLength(2);
  });

  it('étoiles : bornées entre 0 et 5', () => {
    expect(starsText(4)).toBe('★★★★☆');
    expect(starsText(9)).toBe('★★★★★');
    expect(starsText(-1)).toBe('☆☆☆☆☆');
  });
});
