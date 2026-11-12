import {parseEnvelope, safeEnvelope} from '@core/network/envelope';
import {NetworkError, TimeoutError, RequestAbortedError} from '@core/network/errors';
import type {HttpResponse} from '@core/network/types';

function resp(
  partial: Partial<HttpResponse> & {status: number},
): HttpResponse {
  return {
    ok: partial.status >= 200 && partial.status < 300,
    body: null,
    bodyKind: 'json',
    ...partial,
  };
}

describe('parseEnvelope', () => {
  it('success vrai seulement si success === true', () => {
    const r = parseEnvelope(
      resp({status: 200, body: {success: true, data: {id: 1}}}),
    );
    expect(r.success).toBe(true);
    expect(r.data).toEqual({id: 1});
  });

  it('success faux si success absent ou false', () => {
    expect(
      parseEnvelope(resp({status: 200, body: {success: false}})).success,
    ).toBe(false);
    expect(parseEnvelope(resp({status: 200, body: {}})).success).toBe(false);
  });

  it('extrait field et retryAfterSeconds du corps ou de data', () => {
    const r = parseEnvelope(
      resp({
        status: 422,
        body: {
          success: false,
          code: 'VALIDATION',
          field: 'email',
          data: {retryAfterSeconds: 9},
        },
      }),
    );
    expect(r.field).toBe('email');
    expect(r.retryAfterSeconds).toBe(9);
    expect(r.code).toBe('VALIDATION');
  });

  it('réponse non JSON → INVALID_RESPONSE', () => {
    const r = parseEnvelope(
      resp({status: 200, bodyKind: 'invalid', body: null}),
    );
    expect(r.success).toBe(false);
    expect(r.code).toBe('INVALID_RESPONSE');
  });

  it('corps vide → INVALID_RESPONSE', () => {
    const r = parseEnvelope(resp({status: 204, bodyKind: 'empty', body: null}));
    expect(r.code).toBe('INVALID_RESPONSE');
  });
});

describe('safeEnvelope', () => {
  it('retourne l\'enveloppe d\'une HttpResponse réussie', async () => {
    const r = await safeEnvelope(
      Promise.resolve(
        resp({status: 200, body: {success: true, data: null}}),
      ),
    );
    expect(r.success).toBe(true);
    expect(r.status).toBe(200);
  });

  it('NetworkError → code NETWORK_ERROR status 0', async () => {
    const r = await safeEnvelope(Promise.reject(new NetworkError()));
    expect(r.code).toBe('NETWORK_ERROR');
    expect(r.status).toBe(0);
    expect(r.success).toBe(false);
  });

  it('TimeoutError → NETWORK_ERROR status 0', async () => {
    const r = await safeEnvelope(Promise.reject(new TimeoutError()));
    expect(r.code).toBe('NETWORK_ERROR');
    expect(r.status).toBe(0);
  });

  it('RequestAbortedError → NETWORK_ERROR status 0', async () => {
    const r = await safeEnvelope(Promise.reject(new RequestAbortedError()));
    expect(r.code).toBe('NETWORK_ERROR');
    expect(r.status).toBe(0);
  });
});
