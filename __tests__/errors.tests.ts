import {NetworkError, TimeoutError, RequestAbortedError} from '@core/network/errors';

describe('errors', () => {
  it('NetworkError a code NETWORK_ERROR', () => {
    const e = new NetworkError();
    expect(e.code).toBe('NETWORK_ERROR');
    expect(e).toBeInstanceOf(Error);
  });

  it('TimeoutError a code TIMEOUT', () => {
    expect(new TimeoutError().code).toBe('TIMEOUT');
  });

  it('RequestAbortedError a code ABORTED', () => {
    expect(new RequestAbortedError().code).toBe('ABORTED');
  });

  it('messages sans adresse ni en-tête', () => {
    const e = new NetworkError();
    expect(e.message).not.toMatch(/https?:\/\//);
    expect(e.message).not.toMatch(/Authorization/i);
  });
});
