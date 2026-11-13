/**
 * Tests du client HTTP (L0b).
 * Registre simulé avec des adresses .invalid uniquement (R-NET-1).
 *
 * Règle : on ne place JAMAIS d'expect dans un faux fetch. Le client attrape
 * toute exception levée pendant fetch et la transforme en NetworkError, ce qui
 * masquerait l'échec réel. On capture l'appel, puis on vérifie après.
 */

jest.mock('@core/config/serviceRegistry', () => ({
  resolveServiceUrl: (service: string, path: string) => {
    const base = `https://${service}.example.invalid`;
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${base}${p}`;
  },
}));

import {
  http,
  prepareRequest,
  DEFAULT_TIMEOUT_MS,
} from '@core/network/httpClient';
import {
  NetworkError,
  TimeoutError,
  RequestAbortedError,
} from '@core/network/errors';
import {configureHttpAuth, resetHttpAuth} from '@core/network/authProviders';
import {
  isRateLimited,
  resetRateLimits,
  msUntilAvailable,
} from '@core/network/rateLimitGate';

type FetchHolder = {fetch: typeof fetch};
const holder = globalThis as unknown as FetchHolder;
const originalFetch = holder.fetch;

type Call = {
  url: string;
  method: string | undefined;
  headers: Record<string, string>;
  body: RequestInit['body'] | undefined;
};

/** Remplace fetch ; retourne la liste des appels capturés. */
function stubFetch(respond: () => Response | Promise<Response>): Call[] {
  const calls: Call[] = [];
  holder.fetch = (async (input: unknown, init?: RequestInit) => {
    calls.push({
      url: String(input),
      method: init?.method,
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: init?.body ?? undefined,
    });
    return respond();
  }) as unknown as typeof fetch;
  return calls;
}

const ok = (body: unknown = {}, status = 200): Response =>
  new Response(JSON.stringify(body), {status});

beforeEach(() => {
  resetHttpAuth();
  resetRateLimits();
  holder.fetch = originalFetch;
});

afterAll(() => {
  holder.fetch = originalFetch;
});

describe('httpClient — résolution d\'adresse', () => {
  it('résout un chemin relatif via le registre', async () => {
    const calls = stubFetch(() => ok({ok: true}));
    const res = await http.service('payment').get('/login');
    expect(calls[0].url).toBe('https://payment.example.invalid/login');
    expect(res.status).toBe(200);
    expect(res.bodyKind).toBe('json');
  });

  it('refuse une adresse absolue', async () => {
    const calls = stubFetch(() => ok());
    await expect(
      http.service('payment').get('https://evil.example.invalid/x'),
    ).rejects.toBeInstanceOf(NetworkError);
    expect(calls).toHaveLength(0);
  });

  it('encode les paramètres query et ignore undefined et null', async () => {
    const calls = stubFetch(() => ok());
    await http.service('shop').get('/items', {
      query: {a: 1, b: true, c: undefined, d: null, e: 'x y'},
    });
    const url = calls[0].url;
    expect(url).toContain('a=1');
    expect(url).toContain('b=true');
    expect(url).toContain('e=x%20y');
    expect(url).not.toContain('c=');
    expect(url).not.toContain('d=');
  });
});

describe('httpClient — authentification', () => {
  it('ajoute Authorization Bearer quand auth=bearer et jeton présent', async () => {
    configureHttpAuth({getBearerToken: () => 'tok-123'});
    const calls = stubFetch(() => ok());
    await http.service('payment').get('/me', {auth: 'bearer'});
    expect(calls[0].headers.Authorization).toBe('Bearer tok-123');
    expect(calls[0].headers['X-Access-Proof']).toBeUndefined();
  });

  it('ajoute X-Access-Proof quand auth=accessProof et preuve présente', async () => {
    configureHttpAuth({getAccessProof: () => 'proof-xyz'});
    const calls = stubFetch(() => ok());
    await http.service('shop').get('/cart', {auth: 'accessProof'});
    expect(calls[0].headers['X-Access-Proof']).toBe('proof-xyz');
    expect(calls[0].headers.Authorization).toBeUndefined();
  });

  it('community utilise accessProof par défaut', async () => {
    configureHttpAuth({getAccessProof: () => 'c-proof'});
    const calls = stubFetch(() => ok());
    await http.service('community').get('/home');
    expect(calls[0].headers['X-Access-Proof']).toBe('c-proof');
  });

  it('omet l\'en-tête si le fournisseur renvoie null', async () => {
    configureHttpAuth({getAccessProof: () => null});
    const calls = stubFetch(() => ok());
    await http.service('community').get('/x');
    expect(calls[0].headers['X-Access-Proof']).toBeUndefined();
  });

  it('les en-têtes appelant n\'écrasent pas Authorization (casse comprise)', async () => {
    configureHttpAuth({getBearerToken: () => 'real-token'});
    const calls = stubFetch(() => ok());
    await http.service('payment').get('/me', {
      auth: 'bearer',
      headers: {
        authorization: 'evil',
        Authorization: 'evil2',
        'X-Payment-Tracking-Token': 'track-1',
      },
    });
    const h = calls[0].headers;
    expect(h.Authorization).toBe('Bearer real-token');
    const authKeys = Object.keys(h).filter(
      k => k.toLowerCase() === 'authorization',
    );
    expect(authKeys).toEqual(['Authorization']);
    expect(h['X-Payment-Tracking-Token']).toBe('track-1');
  });

  it('les en-têtes appelant n\'écrasent pas X-Access-Proof (casse comprise)', async () => {
    configureHttpAuth({getAccessProof: () => 'real-proof'});
    const calls = stubFetch(() => ok());
    await http.service('community').get('/me', {
      headers: {
        'x-access-proof': 'evil',
        'X-Access-Proof': 'evil2',
      },
    });
    const h = calls[0].headers;
    expect(h['X-Access-Proof']).toBe('real-proof');
    const proofKeys = Object.keys(h).filter(
      k => k.toLowerCase() === 'x-access-proof',
    );
    expect(proofKeys).toEqual(['X-Access-Proof']);
  });

  it('un en-tête appelant ne crée pas Authorization si le mode ne le prévoit pas', async () => {
    const calls = stubFetch(() => ok());
    await http.service('shop').get('/x', {
      auth: 'none',
      headers: {Authorization: 'evil'},
    });
    const authKeys = Object.keys(calls[0].headers).filter(
      k => k.toLowerCase() === 'authorization',
    );
    expect(authKeys).toEqual([]);
  });

  it('accepte X-Payment-Tracking-Token en en-tête additionnel', async () => {
    const calls = stubFetch(() => ok());
    await http.service('payment').post('/register', {a: 1}, {
      headers: {'X-Payment-Tracking-Token': 'track-abc'},
    });
    expect(calls[0].headers['X-Payment-Tracking-Token']).toBe('track-abc');
  });
});

describe('httpClient — corps et FormData', () => {
  it('envoie un corps JSON avec Content-Type application/json', async () => {
    const calls = stubFetch(() => ok());
    await http.service('shop').post('/cart', {x: 1});
    expect(calls[0].method).toBe('POST');
    expect(calls[0].headers['Content-Type']).toBe('application/json');
    expect(calls[0].body).toBe(JSON.stringify({x: 1}));
  });

  it('FormData : pas de Content-Type posé à la main', async () => {
    const fd = new FormData();
    fd.append('field', 'value');
    const calls = stubFetch(() => ok());
    await http
      .service('marketplace')
      .postForm('/upload', fd, {auth: 'accessProof'});
    expect(calls[0].headers['Content-Type']).toBeUndefined();
    expect(calls[0].body).toBe(fd);
  });

  it('GET n\'envoie pas de corps', async () => {
    const calls = stubFetch(() => ok());
    await http.service('payment').get('/x', {body: {a: 1}});
    expect(calls[0].body).toBeUndefined();
  });
});

describe('httpClient — réponses', () => {
  it('corps vide donne bodyKind empty', async () => {
    // Un statut 204 n'accepte pas de corps : new Response(null, ...)
    stubFetch(() => new Response(null, {status: 204}));
    const res = await http.service('shop').get('/empty');
    expect(res.status).toBe(204);
    expect(res.bodyKind).toBe('empty');
    expect(res.body).toBeNull();
  });

  it('corps texte vide en 200 donne bodyKind empty', async () => {
    stubFetch(() => new Response('', {status: 200}));
    const res = await http.service('shop').get('/empty');
    expect(res.bodyKind).toBe('empty');
    expect(res.body).toBeNull();
  });

  it('corps non JSON donne bodyKind invalid', async () => {
    stubFetch(() => new Response('not-json', {status: 200}));
    const res = await http.service('shop').get('/bad');
    expect(res.bodyKind).toBe('invalid');
    expect(res.body).toBeNull();
  });

  it('renvoie HttpResponse même pour 4xx et 5xx, sans lever', async () => {
    stubFetch(() => ok({success: false}, 403));
    const res = await http.service('shop').get('/forbidden');
    expect(res.status).toBe(403);
    expect(res.ok).toBe(false);
    expect(res.body).toEqual({success: false});
  });
});

describe('httpClient — rate limit', () => {
  it('429 notifie le gate avec retryAfterSeconds du corps', async () => {
    stubFetch(() => ok({code: 'RATE_LIMITED', retryAfterSeconds: 12}, 429));
    await http.service('community').get('/x');
    expect(isRateLimited('community')).toBe(true);
    const ms = msUntilAvailable('community');
    expect(ms).toBeGreaterThan(10_000);
    expect(ms).toBeLessThanOrEqual(12_000);
  });

  it('RATE_LIMITED en HTTP 200 notifie aussi (secondes dans data)', async () => {
    stubFetch(() =>
      ok({success: false, code: 'RATE_LIMITED', data: {retryAfterSeconds: 5}}),
    );
    await http.service('community').get('/y');
    expect(isRateLimited('community')).toBe(true);
    expect(msUntilAvailable('community')).toBeLessThanOrEqual(5_000);
  });

  it('utilise Retry-After de l\'en-tête si le corps n\'a pas de secondes', async () => {
    stubFetch(
      () =>
        new Response(JSON.stringify({code: 'RATE_LIMITED'}), {
          status: 429,
          headers: {'Retry-After': '8'},
        }),
    );
    await http.service('shop').get('/z');
    expect(isRateLimited('shop')).toBe(true);
    expect(msUntilAvailable('shop')).toBeLessThanOrEqual(8_000);
  });

  it('défaut 30 s si aucune valeur', async () => {
    stubFetch(() => ok({code: 'RATE_LIMITED'}, 429));
    await http.service('marketplace').get('/r');
    const ms = msUntilAvailable('marketplace');
    expect(ms).toBeGreaterThan(25_000);
    expect(ms).toBeLessThanOrEqual(30_000);
  });

  it('le gate est indexé par service', async () => {
    stubFetch(() => ok({code: 'RATE_LIMITED', retryAfterSeconds: 10}, 429));
    await http.service('community').get('/x');
    expect(isRateLimited('community')).toBe(true);
    expect(isRateLimited('shop')).toBe(false);
  });
});

describe('httpClient — onUnauthorized', () => {
  it('appelle onUnauthorized sur 401 si auth n\'est pas none', async () => {
    const spy = jest.fn();
    configureHttpAuth({getBearerToken: () => 't', onUnauthorized: spy});
    stubFetch(() => ok({code: 'UNAUTHORIZED'}, 401));
    await http.service('payment').get('/me', {auth: 'bearer'});
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        service: 'payment',
        status: 401,
        code: 'UNAUTHORIZED',
        auth: 'bearer',
      }),
    );
  });

  it('appelle onUnauthorized pour accessProof', async () => {
    const spy = jest.fn();
    configureHttpAuth({getAccessProof: () => 'p', onUnauthorized: spy});
    stubFetch(() => ok({}, 401));
    await http.service('community').get('/me');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('n\'appelle pas onUnauthorized si auth=none', async () => {
    const spy = jest.fn();
    configureHttpAuth({onUnauthorized: spy});
    stubFetch(() => ok({}, 401));
    await http.service('payment').get('/public', {auth: 'none'});
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('httpClient — timeout et abort', () => {
  it('TimeoutError si le délai est dépassé, même si fetch ignore le signal', async () => {
    holder.fetch = (() =>
      new Promise<Response>(() => {
        /* ne se termine jamais */
      })) as unknown as typeof fetch;
    await expect(
      http.service('payment').get('/slow', {timeoutMs: 30}),
    ).rejects.toBeInstanceOf(TimeoutError);
  });

  it('RequestAbortedError si le signal appelant est aborté', async () => {
    const controller = new AbortController();
    holder.fetch = (() =>
      new Promise<Response>(() => {
        /* ne se termine jamais */
      })) as unknown as typeof fetch;
    const promise = http
      .service('payment')
      .get('/x', {signal: controller.signal, timeoutMs: 5000});
    controller.abort();
    await expect(promise).rejects.toBeInstanceOf(RequestAbortedError);
  });

  it('RequestAbortedError si le signal est déjà aborté avant l\'appel', async () => {
    const controller = new AbortController();
    controller.abort();
    holder.fetch = (() =>
      new Promise<Response>(() => {
        /* ne se termine jamais */
      })) as unknown as typeof fetch;
    await expect(
      http
        .service('payment')
        .get('/x', {signal: controller.signal, timeoutMs: 5000}),
    ).rejects.toBeInstanceOf(RequestAbortedError);
  });

  it('DEFAULT_TIMEOUT_MS vaut 20000 (choix technique, pas une valeur du site)', () => {
    expect(DEFAULT_TIMEOUT_MS).toBe(20_000);
  });
});

describe('httpClient — panne réseau', () => {
  it('NetworkError si fetch rejette', async () => {
    holder.fetch = (async () => {
      throw new TypeError('Network request failed');
    }) as unknown as typeof fetch;
    await expect(http.service('payment').get('/x')).rejects.toBeInstanceOf(
      NetworkError,
    );
  });

  it('le message de NetworkError ne contient ni adresse ni en-tête', async () => {
    holder.fetch = (async () => {
      throw new TypeError('Network request failed');
    }) as unknown as typeof fetch;
    configureHttpAuth({getBearerToken: () => 'secret-token'});
    let message = '';
    try {
      await http.service('payment').get('/x', {auth: 'bearer'});
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).not.toContain('example.invalid');
    expect(message).not.toContain('secret-token');
  });
});

describe('prepareRequest', () => {
  it('retourne la même url et les mêmes en-têtes qu\'une requête réelle', async () => {
    configureHttpAuth({getAccessProof: () => 'p'});
    const calls = stubFetch(() => ok());
    const options = {query: {page: 1}, headers: {'X-Custom': '1'}};
    const prepared = prepareRequest('community', '/conv', options);
    await http.service('community').get('/conv', options);
    expect(prepared.url).toBe(calls[0].url);
    expect(prepared.headers).toEqual(calls[0].headers);
    expect(prepared.headers['X-Access-Proof']).toBe('p');
    expect(prepared.headers['X-Custom']).toBe('1');
  });

  it('refuse une adresse absolue', () => {
    expect(() =>
      prepareRequest('payment', 'https://evil.example.invalid/x'),
    ).toThrow(NetworkError);
  });
});

describe('httpClient — aucun console', () => {
  it('n\'appelle aucun console.* pendant une requête', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    stubFetch(() => ok());
    await http.service('shop').get('/x');
    expect(log).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    log.mockRestore();
    warn.mockRestore();
    error.mockRestore();
  });
});
