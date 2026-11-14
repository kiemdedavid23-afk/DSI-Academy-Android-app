import {parseRegistrationDoneMessage} from '@features/auth/register/logic/registrationMessage';
import {resolvePrefillIdentifier} from '@features/auth/register/logic/prefillIdentifier';
import {lastLoginIdentifier} from '@features/auth/register/logic/lastLoginIdentifier';
import {BUILD_CONFIG} from '@core/config/buildConfig.generated';

const origin = `${BUILD_CONFIG.registry.web.replace(/\/+$/, '')}/inscription`;

describe('parseRegistrationDoneMessage', () => {
  beforeEach(() => lastLoginIdentifier.clear());

  it('accepte un message valide', () => {
    const r = parseRegistrationDoneMessage(
      JSON.stringify({type: 'dsi:registration-done', identifiant: 'user@test.invalid'}),
      origin,
    );
    expect(r?.identifiant).toBe('user@test.invalid');
  });

  it('refuse mauvais type', () => {
    expect(
      parseRegistrationDoneMessage(
        JSON.stringify({type: 'other', identifiant: 'a@b.c'}),
        origin,
      ),
    ).toBeNull();
  });

  it('refuse origine étrangère', () => {
    expect(
      parseRegistrationDoneMessage(
        JSON.stringify({type: 'dsi:registration-done', identifiant: 'a@b.c'}),
        'https://evil.invalid/',
      ),
    ).toBeNull();
  });

  it('refuse identifiant vide ou trop long', () => {
    expect(
      parseRegistrationDoneMessage(
        JSON.stringify({type: 'dsi:registration-done', identifiant: '  '}),
        origin,
      ),
    ).toBeNull();
    expect(
      parseRegistrationDoneMessage(
        JSON.stringify({
          type: 'dsi:registration-done',
          identifiant: 'x'.repeat(255),
        }),
        origin,
      ),
    ).toBeNull();
  });

  it('ignore identifiant DSI-', () => {
    expect(
      parseRegistrationDoneMessage(
        JSON.stringify({type: 'dsi:registration-done', identifiant: 'DSI-00000'}),
        origin,
      ),
    ).toBeNull();
  });

  it('JSON invalide → null', () => {
    expect(parseRegistrationDoneMessage('{', origin)).toBeNull();
  });

  it('ignore un jeton présent dans le message', () => {
    const r = parseRegistrationDoneMessage(
      JSON.stringify({
        type: 'dsi:registration-done',
        identifiant: 'user@test.invalid',
        token: 'TEST_TOKEN_NOT_REAL',
      }),
      origin,
    );
    expect(r?.identifiant).toBe('user@test.invalid');
    expect(JSON.stringify(r)).not.toContain('TOKEN');
  });
});

describe('resolvePrefillIdentifier', () => {
  beforeEach(() => lastLoginIdentifier.clear());

  it('priorité au message valide', () => {
    lastLoginIdentifier.set('fallback@test.invalid');
    expect(resolvePrefillIdentifier('main@test.invalid')).toBe(
      'main@test.invalid',
    );
  });

  it('fallback si message absent', () => {
    lastLoginIdentifier.set('+22500000000');
    expect(resolvePrefillIdentifier(null)).toBe('+22500000000');
  });

  it('vide si aucun', () => {
    expect(resolvePrefillIdentifier(undefined)).toBe('');
  });

  it('ignore DSI- et bascule sur fallback', () => {
    lastLoginIdentifier.set('ok@test.invalid');
    expect(resolvePrefillIdentifier('DSI-00000')).toBe('ok@test.invalid');
  });
});
