import {
  buildDraftInjectionScript,
  buildDraftPayload,
} from '@features/auth/registration-browser/logic/draftInjection';
import {isSiteUrl} from '@core/config/serviceRegistry';
import {BUILD_CONFIG} from '@core/config/buildConfig.generated';

describe('draft injection', () => {
  it('construit le payload direct', () => {
    const p = buildDraftPayload({
      userId: 'DSI-00000',
      paymentTrackingToken: 'TEST_TRACKING_TOKEN_NOT_REAL',
      paymentUrl: null,
      paymentMode: 'direct',
    });
    expect(p).toEqual({
      userId: 'DSI-00000',
      paymentTrackingToken: 'TEST_TRACKING_TOKEN_NOT_REAL',
      paymentUrl: null,
      paymentMode: 'direct',
      etape: 'confirmation',
    });
  });

  it('construit le payload hosted', () => {
    const p = buildDraftPayload({
      userId: 'DSI-00000',
      paymentTrackingToken: 'TEST_TRACKING_TOKEN_NOT_REAL',
      paymentUrl: 'https://checkout.example.invalid/pay/TEST',
      paymentMode: 'hosted',
    });
    expect(p.etape).toBe('paiement');
    expect(p.paymentUrl).toContain('.invalid');
  });

  it('script échappe les valeurs et se termine par true;', () => {
    const script = buildDraftInjectionScript(
      buildDraftPayload({
        userId: 'DSI-00000',
        paymentTrackingToken: 'TEST_TRACKING_TOKEN_NOT_REAL',
        paymentUrl: null,
        paymentMode: 'direct',
      }),
    );
    expect(script.endsWith('true;')).toBe(true);
    expect(script).toContain('dsi_inscription_draft');
    expect(script).toContain('TEST_TRACKING_TOKEN_NOT_REAL');
  });

  it('startUrl site est acceptée pour injection', () => {
    const url = `${BUILD_CONFIG.registry.web.replace(/\/+$/, '')}/inscription?embed=app`;
    expect(isSiteUrl(url)).toBe(true);
  });
});
