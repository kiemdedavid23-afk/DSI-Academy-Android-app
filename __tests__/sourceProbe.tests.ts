/* eslint-disable prettier/prettier */
import {probeSource} from '@core/network/sourceProbe';

const URL_TEST = 'https://files.example.invalid/f';
const res = (status: number, headers: Record<string, string> = {}) => ({
  status,
  headers: {get: (k: string) => headers[k] ?? headers[k.toLowerCase()] ?? null},
});
const mockFetch = jest.fn();
beforeEach(() => {
  mockFetch.mockReset();
  (globalThis as any).fetch = mockFetch;
});

describe('probeSource', () => {
  it('envoie Range 0-0 et lit taille et type depuis Content-Range', async () => {
    mockFetch.mockResolvedValue(res(206, {'Content-Type': 'application/pdf; charset=binary', 'Content-Range': 'bytes 0-0/2048'}));
    const r = await probeSource(URL_TEST);
    expect(mockFetch.mock.calls[0][0]).toBe(URL_TEST);
    expect(mockFetch.mock.calls[0][1]).toMatchObject({method: 'GET', headers: {Range: 'bytes=0-0'}});
    expect(r).toEqual({kind: 'ok', status: 206, contentType: 'application/pdf', totalBytes: 2048, rangeSupported: true});
  });
  it('200 sans Range : taille depuis Content-Length, Range non supporté', async () => {
    mockFetch.mockResolvedValue(res(200, {'Content-Type': 'audio/mpeg', 'Content-Length': '500'}));
    expect(await probeSource(URL_TEST)).toMatchObject({kind: 'ok', totalBytes: 500, rangeSupported: false});
  });
  it('200 avec Accept-Ranges: bytes → Range supporté', async () => {
    mockFetch.mockResolvedValue(res(200, {'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes', 'Content-Length': '10'}));
    expect(await probeSource(URL_TEST)).toMatchObject({rangeSupported: true});
  });
  it('page web (confirmation ou quota) → htmlPage', async () => {
    mockFetch.mockResolvedValue(res(200, {'Content-Type': 'text/html; charset=utf-8'}));
    expect(await probeSource(URL_TEST)).toEqual({kind: 'failure', reason: 'htmlPage', status: 200});
  });
  it('statuts : 403 rejeté, 404/410 introuvable, 429 limite, 5xx et autres serveur', async () => {
    const cases: Array<[number, string]> = [[401, 'rejected'], [403, 'rejected'], [404, 'notFound'], [410, 'notFound'], [429, 'rateLimited'], [500, 'server'], [416, 'server'], [302, 'server']];
    for (const [status, reason] of cases) {
      mockFetch.mockResolvedValue(res(status));
      expect(await probeSource(URL_TEST)).toEqual({kind: 'failure', reason, status});
    }
  });
  it('exception réseau → network (sans adresse dans le résultat)', async () => {
    mockFetch.mockRejectedValue(new TypeError('Network request failed'));
    const r = await probeSource(URL_TEST);
    expect(r).toEqual({kind: 'failure', reason: 'network', status: null});
    expect(JSON.stringify(r)).not.toContain('example.invalid');
  });
  it('délai dépassé → timeout ; annulation → aborted', async () => {
    mockFetch.mockImplementation((_u: string, init: {signal: AbortSignal}) => new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(new Error('abort')));
    }));
    expect(await probeSource(URL_TEST, {timeoutMs: 10})).toEqual({kind: 'failure', reason: 'timeout', status: null});
    const c = new AbortController();
    const p = probeSource(URL_TEST, {signal: c.signal, timeoutMs: 5000});
    c.abort();
    expect(await p).toEqual({kind: 'failure', reason: 'aborted', status: null});
    const done = new AbortController();
    done.abort();
    expect(await probeSource(URL_TEST, {signal: done.signal})).toMatchObject({reason: 'aborted'});
  });
});
