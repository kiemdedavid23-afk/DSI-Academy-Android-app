import {
  communityProfileView,
  initialsOf,
  isPseudonymValid,
  isReservedPseudonym,
  normalizePseudonym,
} from '../src/shared/community';

const base = {status: 'idle' as const, data: null, error: null};

describe('Carte profil communautaire : état affiché', () => {
  it('chargement tant que rien n’est arrivé', () => {
    expect(communityProfileView(base, true)).toBe('loading');
    expect(communityProfileView({...base, status: 'loading'}, true)).toBe('loading');
  });
  it('sans profil : création', () => {
    const data = {needsProfile: true, profile: null};
    expect(communityProfileView({status: 'success', data, error: null}, true)).toBe(
      'needsProfile',
    );
  });
  it('profil présent : prêt, et un rechargement en échec le garde affiché', () => {
    const data = {needsProfile: false, profile: {}};
    expect(communityProfileView({status: 'success', data, error: null}, true)).toBe('ready');
    expect(communityProfileView({status: 'error', data, error: 'NETWORK_ERROR'}, true)).toBe(
      'ready',
    );
  });
  it('erreurs sans données', () => {
    const err = (error: string, sub: boolean | null = true) =>
      communityProfileView({status: 'error', data: null, error}, sub);
    expect(err('noProof')).toBe('session');
    expect(err('ACCESS_PROOF_EXPIRED', true)).toBe('session');
    expect(err('ACCESS_PROOF_EXPIRED', false)).toBe('subscription');
    expect(err('SUBSCRIPTION_INACTIVE')).toBe('subscription');
    expect(err('network')).toBe('error');
  });
});

describe('Pseudonyme', () => {
  it('normalisation alignée sur le Worker', () => {
    expect(normalizePseudonym('  @Awa Diallo ')).toBe('awa_diallo');
    expect(normalizePseudonym('Élodie--Zoé')).toBe('elodie_zoe');
    expect(normalizePseudonym('a'.repeat(50))).toHaveLength(32);
    expect(normalizePseudonym('___')).toBe('');
  });
  it('validité et réservés', () => {
    expect(isPseudonymValid('a')).toBe(false);
    expect(isPseudonymValid('ab')).toBe(true);
    expect(isReservedPseudonym('admin')).toBe(true);
    expect(isReservedPseudonym('awa')).toBe(false);
  });
  it('initiales', () => {
    expect(initialsOf('Awa Diallo')).toBe('AD');
    expect(initialsOf('awa')).toBe('A');
    expect(initialsOf('  ')).toBe('?');
  });
});
