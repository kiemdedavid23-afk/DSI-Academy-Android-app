import {parseRegistrationDoneMessage} from '@features/auth/registration-browser/logic/registrationMessage';
import {resolvePrefillIdentifier} from '@features/auth/registration-browser/logic/prefillIdentifier';
import {lastLoginIdentifier} from '@core/session';
import {BUILD_CONFIG} from '@core/config/buildConfig.generated';

const origin = `${BUILD_CONFIG.registry.web.replace(/\/+$/, '')}/inscription`;

describe('parseRegistrationDoneMessage (L1b patch)', () => {
  beforeEach(() => lastLoginIdentifier.clear());

  it('accepte message avec identifiant valide', () => {
    const r = parseRegistrationDoneMessage(
      JSON.stringify({
        type: 'dsi:registration-done',
        identifiant: 'user@test.invalid',
        reason: 'success',
      }),
      origin,
    );
    expect(r?.identifiant).toBe('user@test.invalid');
  });

  it('accepte identifiant vide (traité null) + ferme quand même côté store', () => {
    const r = parseRegistrationDoneMessage(
      JSON.stringify({type: 'dsi:registration-done', identifiant: ''}),
      origin,
    );
    expect(r).not.toBeNull();
    expect(r?.identifiant).toBeNull();
  });

  it('DSI- traité comme absent', () => {
    const r = parseRegistrationDoneMessage(
      JSON.stringify({
        type: 'dsi:registration-done',
        identifiant: 'DSI-12345',
      }),
      origin,
    );
    expect(r?.identifiant).toBeNull();
  });

  it('reason inconnu ignoré', () => {
    const r = parseRegistrationDoneMessage(
      JSON.stringify({
        type: 'dsi:registration-done',
        identifiant: 'a@b.c',
        reason: 'whatever',
      }),
      origin,
    );
    expect(r?.identifiant).toBe('a@b.c');
  });

  it('champs supplémentaires ignorés', () => {
    const r = parseRegistrationDoneMessage(
      JSON.stringify({
        type: 'dsi:registration-done',
        identifiant: 'a@b.c',
        token: 'TEST_TOKEN_NOT_REAL',
        userId: 'DSI-00000',
      }),
      origin,
    );
    expect(JSON.stringify(r)).not.toContain('TOKEN');
    expect(JSON.stringify(r)).not.toContain('userId');
  });

  it('origine étrangère ignorée', () => {
    expect(
      parseRegistrationDoneMessage(
        JSON.stringify({type: 'dsi:registration-done'}),
        'https://evil.invalid/',
      ),
    ).toBeNull();
  });

  it('type différent ignoré', () => {
    expect(
      parseRegistrationDoneMessage(
        JSON.stringify({type: 'other'}),
        origin,
      ),
    ).toBeNull();
  });

  it('JSON invalide ignoré', () => {
    expect(parseRegistrationDoneMessage('{', origin)).toBeNull();
  });
});

describe('resolvePrefillIdentifier', () => {
  beforeEach(() => lastLoginIdentifier.clear());

  it('priorité message valide', () => {
    lastLoginIdentifier.set('fallback@test.invalid');
    expect(resolvePrefillIdentifier('main@test.invalid')).toBe(
      'main@test.invalid',
    );
  });

  it('repli si message null', () => {
    lastLoginIdentifier.set('+22500000000');
    expect(resolvePrefillIdentifier(null)).toBe('+22500000000');
  });

  it('vide sans repli', () => {
    expect(resolvePrefillIdentifier(null)).toBe('');
  });
});
