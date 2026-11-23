import fr from '../src/shared/i18n/locales/community.fr.json';
import en from '../src/shared/i18n/locales/community.en.json';
import profileFr from '../src/shared/i18n/locales/communityProfile.fr.json';
import profileEn from '../src/shared/i18n/locales/communityProfile.en.json';
import {
  communityErrorKey,
  communityGate,
  communityProfileErrorKey,
  isCommunitySessionCode,
  isCommunitySubscriptionCode,
} from '../src/shared/community';

const has = (tree: unknown, key: string): boolean =>
  key.split('.').reduce<unknown>(
    (node, part) =>
      node && typeof node === 'object'
        ? (node as Record<string, unknown>)[part]
        : undefined,
    tree,
  ) !== undefined;

describe('Communauté : clés d’erreur', () => {
  const codes = [
    'ACCESS_PROOF_EXPIRED', 'SUBSCRIPTION_INACTIVE', 'PROFILE_INCOMPLETE',
    'VALIDATION', 'NOT_FOUND', 'MEMBER_NOT_IN_COMMUNITY', 'ACCESS_DENIED',
    'FORBIDDEN', 'CONFLICT', 'INVALID_STATE', 'CONTACT_REQUIRED',
    'INTERACTION_UNAVAILABLE', 'MEDIA_MODE_UNSUPPORTED', 'CALL_QUOTA_EXCEEDED',
    'MEDIA_SERVICE_UNAVAILABLE', 'STORAGE_UNAVAILABLE', 'UPSTREAM',
    'RATE_LIMITED', 'NETWORK_ERROR', 'INCONNU',
  ];
  it('chaque code donne une clé présente en français et en anglais', () => {
    codes.forEach(code => {
      const key = communityErrorKey(code);
      expect(has(fr, key)).toBe(true);
      expect(has(en, key)).toBe(true);
    });
  });
  it('chaque clé de profil et de photo existe en FR et EN', () => {
    const pairs: Array<[string, string | null]> = [
      ['VALIDATION', 'displayName'], ['VALIDATION', 'pseudonym'],
      ['VALIDATION', null], ['CONFLICT', 'pseudonym'],
      ['AVATAR_TOO_LARGE', 'file'], ['AVATAR_UNSUPPORTED_TYPE', 'file'],
      ['AVATAR_UNREADABLE', 'file'], ['STORAGE_UNAVAILABLE', 'file'],
      ['ACCESS_PROOF_INVALID', null], ['SUBSCRIPTION_INACTIVE', null],
      ['PROFILE_INCOMPLETE', null], ['RATE_LIMITED', null], ['X', null],
    ];
    pairs.forEach(([code, field]) => {
      const key = communityProfileErrorKey(code, field);
      expect(has(profileFr, key)).toBe(true);
      expect(has(profileEn, key)).toBe(true);
    });
  });
  it('preuve périmée + abonnement terminé = erreur d’abonnement', () => {
    expect(communityErrorKey('ACCESS_PROOF_EXPIRED', false)).toBe(
      'communityApp.errors.subscriptionInactive',
    );
    expect(isCommunitySubscriptionCode('ACCESS_PROOF_EXPIRED', false)).toBe(true);
    expect(isCommunitySessionCode('ACCESS_PROOF_EXPIRED', false)).toBe(false);
  });
  it('preuve périmée + abonnement actif = session expirée', () => {
    expect(communityErrorKey('ACCESS_PROOF_EXPIRED', true)).toBe(
      'communityApp.errors.sessionExpired',
    );
    expect(isCommunitySessionCode('ACCESS_PROOF_EXPIRED', true)).toBe(true);
  });
});

describe('Communauté : décision de démarrage', () => {
  const base = {userId: 'DSI-1', communityStatus: 'ACTIVE'};
  it('sans profil : création du profil, même sans abonnement', () => {
    const me = {...base, needsProfile: true, profile: null};
    expect(communityGate(me, true)).toBe('needsProfile');
    expect(communityGate(me, false)).toBe('needsProfile');
  });
  it('profil + abonnement terminé : abonnement requis', () => {
    const me = {...base, needsProfile: false, profile: {} as never};
    expect(communityGate(me, false)).toBe('subscriptionRequired');
    expect(communityGate(me, true)).toBe('ready');
  });
});
