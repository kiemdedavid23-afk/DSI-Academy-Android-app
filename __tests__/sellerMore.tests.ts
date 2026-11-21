jest.mock('@core/api/endpoints/marketplace/seller/seller.api', () => ({
  fetchSellerProfile: jest.fn(),
  updateSellerProfile: jest.fn(),
  uploadSellerLogo: jest.fn(),
  fetchSellerReviews: jest.fn(),
  fetchSellerEarnings: jest.fn(),
}));
jest.mock('@shared/store', () => ({
  createResourceStore: () => ({load: jest.fn(), subscribe: jest.fn(), getState: jest.fn()}),
  storeRegistry: {register: () => undefined},
}));
jest.mock('../src/features/commerce/store/pickImage', () => ({
  pickImage: jest.fn(),
  pickErrorKey: (r: string) => `pick.${r}`,
}));

import {
  fetchSellerEarnings,
  fetchSellerProfile,
  fetchSellerReviews,
  updateSellerProfile,
  uploadSellerLogo,
} from '@core/api/endpoints/marketplace/seller/seller.api';
import {pickImage} from '../src/features/commerce/store/pickImage';
import {
  ACCOUNT_MENU,
  SHOP_MENU,
  distributionRows,
  draftFromProfile,
  filledStars,
  formatRating,
  hasProfileChanges,
  ledgerTypeKey,
  logoUploadErrorKey,
  memberFullName,
  profilePatch,
  profileSaveErrorKey,
  validateProfile,
} from '../src/features/commerce/seller/logic/sellerMore';
import {sellerEarnings, sellerEarningsStore} from '../src/features/commerce/seller/store/sellerEarningsStore';
import {sellerProfile, sellerProfileStore} from '../src/features/commerce/seller/store/sellerProfileStore';
import {sellerReviews, sellerReviewsStore} from '../src/features/commerce/seller/store/sellerReviewsStore';
import commerceFr from '../src/shared/i18n/locales/commerce.fr.json';
import commerceEn from '../src/shared/i18n/locales/commerce.en.json';

const fetchProfile = fetchSellerProfile as jest.Mock;
const updateProfile = updateSellerProfile as jest.Mock;
const uploadLogo = uploadSellerLogo as jest.Mock;
const fetchReviews = fetchSellerReviews as jest.Mock;
const fetchEarnings = fetchSellerEarnings as jest.Mock;
const pick = pickImage as jest.Mock;

const limits = {storeNameMax: 80, sloganMax: 120, bioMax: 2000, logoMaxBytes: 8388608};
const profile = {
  storeName: 'Digital Service International',
  slogan: null,
  bio: 'Nous vendons des outils numériques.',
  logoUrl: null,
  status: 'APPROVED' as const,
  rating: 4.5,
  ratingCount: 12,
  storeSlug: 'digital-service-international',
  storeUrl: 'https://dsiacademy.pages.dev/boutique/digital-service-international',
  joinedAt: null,
  limits,
};

beforeEach(() => {
  jest.clearAllMocks();
  sellerProfile.reset();
  sellerReviews.reset();
  sellerEarnings.reset();
});

describe('Plus : menu', () => {
  it('Ma boutique reprend les onglets puis les avis, sans Clients ni Litiges', () => {
    expect(SHOP_MENU.map(i => i.id)).toEqual(['overview', 'products', 'sales', 'analytics', 'reviews']);
    expect(SHOP_MENU.slice(0, 4).map(i => i.action)).toEqual([
      {kind: 'tab', tab: 'overview'},
      {kind: 'tab', tab: 'products'},
      {kind: 'tab', tab: 'sales'},
      {kind: 'tab', tab: 'analytics'},
    ]);
    expect(SHOP_MENU[4].action).toEqual({kind: 'view', view: 'reviews'});
  });
  it('Mon compte vendeur : profil, gains, retraits', () => {
    expect(ACCOUNT_MENU.map(i => i.id)).toEqual(['profile', 'earnings', 'withdrawals']);
    expect(ACCOUNT_MENU[2].action).toEqual({kind: 'withdrawals'});
  });
  it('nom complet du membre', () => {
    expect(memberFullName(' Yacouba ', 'KONATE')).toBe('Yacouba KONATE');
    expect(memberFullName('', 'KONATE')).toBe('KONATE');
    expect(memberFullName(undefined, null)).toBe('');
  });
});

describe('Plus : profil (logique)', () => {
  it('le brouillon part du profil, null devient vide', () => {
    expect(draftFromProfile(profile)).toEqual({
      storeName: 'Digital Service International',
      slogan: '',
      bio: 'Nous vendons des outils numériques.',
    });
  });
  it('validation : nom vide, trop longs', () => {
    const ok = {storeName: 'A', slogan: '', bio: ''};
    expect(validateProfile(ok, limits)).toEqual({});
    expect(validateProfile({...ok, storeName: '   '}, limits)).toEqual({storeName: 'empty'});
    expect(
      validateProfile({storeName: 'x'.repeat(81), slogan: 'y'.repeat(121), bio: 'z'.repeat(2001)}, limits),
    ).toEqual({storeName: 'tooLong', slogan: 'tooLong', bio: 'tooLong'});
    expect(validateProfile({storeName: 'x'.repeat(80), slogan: 'y'.repeat(120), bio: 'z'.repeat(2000)}, limits)).toEqual({});
  });
  it('le PATCH ne porte que les champs modifiés, rognés', () => {
    const d = draftFromProfile(profile);
    expect(profilePatch(profile, d)).toEqual({});
    expect(hasProfileChanges(profile, d)).toBe(false);
    expect(profilePatch(profile, {...d, slogan: '  Modèles et guides  '})).toEqual({slogan: 'Modèles et guides'});
    expect(profilePatch(profile, {...d, storeName: 'Nouvelle', bio: ''})).toEqual({storeName: 'Nouvelle', bio: ''});
    expect(hasProfileChanges(profile, {...d, bio: 'autre'})).toBe(true);
  });
  it('clés d’erreur du profil et du logo', () => {
    expect(profileSaveErrorKey({errorKind: 'network', status: null})).toBe('commerce.sellerSpace.profile.errors.network');
    expect(profileSaveErrorKey({errorKind: 'validation', status: 422})).toBe('commerce.sellerSpace.profile.errors.validation');
    expect(profileSaveErrorKey({errorKind: 'forbidden', status: 403})).toBe('commerce.sellerSpace.profile.errors.forbidden');
    expect(profileSaveErrorKey({errorKind: 'server', status: 500})).toBe('commerce.sellerSpace.profile.errors.unavailable');
    expect(logoUploadErrorKey({errorKind: 'validation', status: 413})).toBe('commerce.sellerSpace.profile.logoErrors.tooLarge');
    expect(logoUploadErrorKey({errorKind: 'validation', status: 422})).toBe('commerce.sellerSpace.profile.logoErrors.rejected');
    expect(logoUploadErrorKey({errorKind: 'unavailable', status: 503, code: 'CONFIG'})).toBe('commerce.sellerSpace.profile.logoErrors.unavailable');
  });
});

describe('Plus : avis et gains (logique)', () => {
  it('répartition de 5 à 1 étoiles', () => {
    const rows = distributionRows({
      rating: 4.5,
      ratingCount: 12,
      distribution: {'1': 0, '2': 1, '3': 1, '4': 3, '5': 7},
    });
    expect(rows.map(r => r.star)).toEqual([5, 4, 3, 2, 1]);
    expect(rows[0]).toEqual({star: 5, count: 7, ratio: 7 / 12});
    const none = distributionRows({rating: null, ratingCount: 0, distribution: {'1': 0, '2': 0, '3': 0, '4': 0, '5': 0}});
    expect(none.every(r => r.ratio === 0)).toBe(true);
  });
  it('note et étoiles', () => {
    expect(formatRating(4.5, 'fr')).toBe('4,5');
    expect(formatRating(4.54, 'en')).toBe('4.5');
    expect(formatRating(null, 'fr')).toBeNull();
    expect(filledStars(4.4)).toBe(4);
    expect(filledStars(9)).toBe(5);
    expect(filledStars(-1)).toBe(0);
  });
  it('type d’écriture : inconnu = crédit générique', () => {
    expect(ledgerTypeKey('SALE_CREDIT')).toBe('commerce.sellerSpace.earnings.type.SALE_CREDIT');
    expect(ledgerTypeKey('AUTRE')).toBe('commerce.sellerSpace.earnings.type.other');
    expect(ledgerTypeKey(null)).toBe('commerce.sellerSpace.earnings.type.other');
  });
});

describe('store du profil', () => {
  it('charge puis enregistre et met à jour les données', async () => {
    fetchProfile.mockResolvedValue({kind: 'success', profile});
    await sellerProfile.load();
    expect(sellerProfileStore.getState().data?.storeName).toBe(profile.storeName);
    updateProfile.mockResolvedValue({kind: 'success', profile: {...profile, slogan: 'Nouveau'}});
    expect(await sellerProfile.save({slogan: 'Nouveau'})).toBe(true);
    expect(sellerProfileStore.getState().data?.slogan).toBe('Nouveau');
    expect(sellerProfileStore.getState().saving).toBe(false);
  });
  it('rien à enregistrer : aucun appel', async () => {
    expect(await sellerProfile.save({})).toBe(true);
    expect(updateProfile).not.toHaveBeenCalled();
  });
  it('échec d’enregistrement : clé i18n, jamais le texte du Worker', async () => {
    updateProfile.mockResolvedValue({kind: 'failure', errorKind: 'validation', status: 422, code: 'VALIDATION'});
    expect(await sellerProfile.save({bio: 'x'})).toBe(false);
    expect(sellerProfileStore.getState().saveErrorKey).toBe('commerce.sellerSpace.profile.errors.validation');
  });
  it('logo : annulation sans effet, envoi mis à jour, 503 indisponible', async () => {
    pick.mockResolvedValueOnce({kind: 'cancelled'});
    await sellerProfile.changeLogo();
    expect(uploadLogo).not.toHaveBeenCalled();

    pick.mockResolvedValueOnce({kind: 'error', reason: 'notImage'});
    await sellerProfile.changeLogo();
    expect(sellerProfileStore.getState().logoErrorKey).toBe('pick.notImage');

    fetchProfile.mockResolvedValue({kind: 'success', profile});
    await sellerProfile.load();
    const image = {uri: 'file:///logo.png', name: 'logo.png', type: 'image/png', size: 1000};
    pick.mockResolvedValue({kind: 'picked', image});
    uploadLogo.mockResolvedValueOnce({kind: 'success', logoUrl: 'https://exemple.invalid/logo.webp'});
    await sellerProfile.changeLogo();
    expect(sellerProfileStore.getState().data?.logoUrl).toBe('https://exemple.invalid/logo.webp');
    expect(sellerProfileStore.getState().logoErrorKey).toBeNull();

    uploadLogo.mockResolvedValueOnce({kind: 'failure', errorKind: 'unavailable', status: 503, code: 'CONFIG'});
    await sellerProfile.changeLogo();
    expect(sellerProfileStore.getState().logoErrorKey).toBe('commerce.sellerSpace.profile.logoErrors.unavailable');
    expect(sellerProfileStore.getState().uploadingLogo).toBe(false);
  });
  it('une réponse tardive d’une ancienne session est ignorée', async () => {
    let resolve: (v: unknown) => void = () => undefined;
    fetchProfile.mockReturnValue(new Promise(r => (resolve = r)));
    const pending = sellerProfile.load();
    sellerProfile.reset();
    resolve({kind: 'success', profile});
    await pending;
    expect(sellerProfileStore.getState().data).toBeNull();
  });
});

describe('store des avis', () => {
  const review = (id: string) => ({id, listingId: null, listingTitle: null, rating: 5, comment: null, authorDisplayName: null, createdAt: null});
  const summary = {rating: 5, ratingCount: 2, distribution: {'1': 0, '2': 0, '3': 0, '4': 0, '5': 2}};
  it('pagine sans doublon', async () => {
    fetchReviews.mockResolvedValueOnce({kind: 'success', page: {summary, items: [review('a')], nextCursor: 'c1'}});
    await sellerReviews.load();
    expect(sellerReviewsStore.getState().nextCursor).toBe('c1');
    fetchReviews.mockResolvedValueOnce({kind: 'success', page: {summary, items: [review('a'), review('b')], nextCursor: null}});
    await sellerReviews.loadMore();
    expect(fetchReviews).toHaveBeenLastCalledWith({cursor: 'c1'});
    expect(sellerReviewsStore.getState().items.map(i => i.id)).toEqual(['a', 'b']);
    await sellerReviews.loadMore();
    expect(fetchReviews).toHaveBeenCalledTimes(2);
  });
  it('erreur de chargement', async () => {
    fetchReviews.mockResolvedValue({kind: 'failure', errorKind: 'network', status: null, code: null});
    await sellerReviews.load();
    expect(sellerReviewsStore.getState().status).toBe('error');
    expect(sellerReviewsStore.getState().error).toBe('network');
  });
});

describe('store des gains', () => {
  const entry = (id: string) => ({id, orderId: null, listingTitle: null, amountDsi: 900, type: 'SALE_CREDIT', createdAt: null});
  it('charge le solde réel et pagine', async () => {
    fetchEarnings.mockResolvedValueOnce({kind: 'success', earnings: {availableDsi: 1237, pendingDsi: 0, ledger: [entry('1')], nextCursor: 'n'}});
    await sellerEarnings.load();
    expect(sellerEarningsStore.getState().availableDsi).toBe(1237);
    fetchEarnings.mockResolvedValueOnce({kind: 'success', earnings: {availableDsi: 1237, pendingDsi: 0, ledger: [entry('1'), entry('2')], nextCursor: null}});
    await sellerEarnings.loadMore();
    expect(sellerEarningsStore.getState().ledger.map(e => e.id)).toEqual(['1', '2']);
  });
  it('503 CONFIG : erreur CONFIG, ancien solde effacé, rien d’inventé', async () => {
    fetchEarnings.mockResolvedValueOnce({kind: 'success', earnings: {availableDsi: 500, pendingDsi: 0, ledger: [entry('1')], nextCursor: null}});
    await sellerEarnings.load();
    fetchEarnings.mockResolvedValueOnce({kind: 'failure', errorKind: 'unavailable', status: 503, code: 'CONFIG'});
    await sellerEarnings.load();
    const s = sellerEarningsStore.getState();
    expect(s.error).toBe('CONFIG');
    expect(s.status).toBe('error');
    expect(s.availableDsi).toBeNull();
    expect(s.ledger).toEqual([]);
  });
});

describe('textes de Plus (fr / en)', () => {
  const keysOf = (o: unknown, p = ''): string[] =>
    o && typeof o === 'object'
      ? Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => keysOf(v, p ? `${p}.${k}` : k))
      : [p];
  const section = (c: typeof commerceFr) => {
    const s = c.commerce.sellerSpace as Record<string, unknown>;
    return {more: s.more, profile: s.profile, reviews: s.reviews, earnings: s.earnings};
  };
  it('mêmes clés en français et en anglais', () => {
    expect(keysOf(section(commerceEn)).sort()).toEqual(keysOf(section(commerceFr)).sort());
  });
  it('chaque ligne du menu a un titre et une description', () => {
    const items = (commerceFr.commerce.sellerSpace.more as {items: Record<string, {title: string; subtitle: string}>}).items;
    for (const item of [...SHOP_MENU, ...ACCOUNT_MENU]) {
      expect(items[item.id].title).toBeTruthy();
      expect(items[item.id].subtitle).toBeTruthy();
    }
  });
  it('toutes les clés d’erreur produites existent', () => {
    const get = (key: string) =>
      key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], commerceFr);
    for (const f of [
      {errorKind: 'network', status: null},
      {errorKind: 'unauthorized', status: 401},
      {errorKind: 'forbidden', status: 403},
      {errorKind: 'validation', status: 422},
      {errorKind: 'validation', status: 413},
      {errorKind: 'server', status: 500},
    ]) {
      expect(typeof get(profileSaveErrorKey(f))).toBe('string');
      expect(typeof get(logoUploadErrorKey(f))).toBe('string');
    }
    expect(typeof get(ledgerTypeKey('SALE_CREDIT'))).toBe('string');
    expect(typeof get(ledgerTypeKey(null))).toBe('string');
  });
});
