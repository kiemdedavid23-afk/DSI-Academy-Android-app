import {
  failureFromEnvelope,
} from '../src/core/api/endpoints/community/common.mapper';
import {mapCommunityMe} from '../src/core/api/endpoints/community/me.mapper';
import {parseEnvelope} from '../src/core/network/envelope';
import noProfile from '../contracts/community/me.noProfile.json';
import withProfile from '../contracts/community/me.withProfile.json';
import proofExpired from '../contracts/community/error.401.proofExpired.json';
import subInactive from '../contracts/community/error.403.subscriptionInactive.json';
import profileIncomplete from '../contracts/community/error.403.profileIncomplete.json';
import rateLimited from '../contracts/community/error.429.rateLimited.json';

const env = (status: number, body: unknown) =>
  parseEnvelope({status, ok: status < 300, body, bodyKind: 'json'});

describe('GET /me', () => {
  it('membre sans profil', () => {
    const r = mapCommunityMe(env(200, noProfile));
    expect(r.kind).toBe('success');
    if (r.kind === 'success') {
      expect(r.me.needsProfile).toBe(true);
      expect(r.me.profile).toBeNull();
      expect(r.me.userId).toBe('DSI-0001');
    }
  });
  it('membre avec profil', () => {
    const r = mapCommunityMe(env(200, withProfile));
    expect(r.kind).toBe('success');
    if (r.kind === 'success') {
      expect(r.me.needsProfile).toBe(false);
      expect(r.me.profile?.publicPseudonym).toBe('@awa');
      expect(r.me.profile?.createdAt).toBe(1750000000000);
      expect(r.me.profile?.avatarUrl).toBeNull();
    }
  });
  it('profil absent alors que needsProfile est faux : contrat inattendu', () => {
    const r = mapCommunityMe(
      env(200, {success: true, data: {needsProfile: false, profile: null}}),
    );
    expect(r.kind === 'failure' && r.errorKind).toBe('invalidResponse');
  });
  it('corps sans needsProfile : contrat inattendu', () => {
    const r = mapCommunityMe(env(200, {success: true, data: {}}));
    expect(r.kind === 'failure' && r.errorKind).toBe('invalidResponse');
  });
});

describe('failureFromEnvelope', () => {
  it('preuve expirée : non autorisé, code conservé', () => {
    const f = failureFromEnvelope(env(401, proofExpired));
    expect(f.errorKind).toBe('unauthorized');
    expect(f.code).toBe('ACCESS_PROOF_EXPIRED');
  });
  it('abonnement inactif et profil incomplet sont distincts', () => {
    expect(failureFromEnvelope(env(403, subInactive)).errorKind).toBe(
      'subscriptionInactive',
    );
    expect(failureFromEnvelope(env(403, profileIncomplete)).errorKind).toBe(
      'profileIncomplete',
    );
  });
  it('429 : délai conservé', () => {
    const f = failureFromEnvelope(env(429, rateLimited));
    expect(f.errorKind).toBe('rateLimited');
    expect(f.retryAfterSeconds).toBe(12);
  });
  it('champ du formulaire conservé', () => {
    const f = failureFromEnvelope(
      env(409, {success: false, code: 'CONFLICT', field: 'pseudonym', data: null}),
    );
    expect(f.errorKind).toBe('conflict');
    expect(f.field).toBe('pseudonym');
  });
  it('réseau et 500 non JSON', () => {
    expect(
      failureFromEnvelope({
        success: false, error: null, code: 'NETWORK_ERROR', data: null, status: 0,
      }).errorKind,
    ).toBe('network');
    expect(
      failureFromEnvelope(
        parseEnvelope({status: 500, ok: false, body: null, bodyKind: 'invalid'}),
      ).errorKind,
    ).toBe('invalidResponse');
  });
});
