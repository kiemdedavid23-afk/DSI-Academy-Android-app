/**
 * Tests du client HTTP (L0b).
 * Registre mocké avec adresses .invalid uniquement (R-NET-1).
 */

jest.mock('../config/serviceRegistry', () => ({
  resolveServiceUrl: (service: string, path: string) => {
    const base = `https://${service}.example.invalid`;
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${base}${p}`;
  },
}));

import {http, prepareRequest, DEFAULT_TIMEOUT_MS} from './httpClient';
import {
  NetworkError,
  TimeoutError,
  RequestAbortedError,
} from './errors';
import {configureHttpAuth, resetHttpAuth} from './authProviders';
import {
  isRateLimited,
  resetRateLimits,
  msUntilAvailable,
} from './rateLimitGate';

const originalFetch = global.fetch;

function mockFetch(impl: typeof fetch) {
  global.fetch = impl as typeof fetch;
}

beforeEach(() => {
  resetHttpAuth();
  resetRateLimits();
  global.fetch = originalFetch;
});

afterAll(() => {
  global.fetch = originalFetch;
});

describe('httpClient — résolution d\'adresse', () => {
  it('résout un chemin relatif via le registre', async () => {
    mockFetch(async (input) => {
      expect(String(input)).toBe('https://payment.example.invalid/login');
      return new Response(JSON.stringify({ok: true}), {status: 200});
    });
    const res = await http.service('payment').get('/login');
    expect(res.status).toBe(200);
    expect(res.bodyKind).toBe('json');
  });

  it('refuse une adresse absolue', async () => {
    await expect(
      http.service('payment').get('https://evil.example.invalid/x'),
    ).rejects.toBeInstanceOf(NetworkError);
  });

  it('encode les paramètres query et ignore undefined', async () => {
    mockFetch(async (input) => {
      const url = String(input);
      expect(url).toContain('a=1');
      expect(url).toContain('b=true');
      expect(url).not.toContain('c=');
      return new Response('{}', {status: 200});
    });
    await http.service('shop').get('/items', {
      query: {a: 1, b: true, c: undefined, d: null},
    });
  });
});

describe('httpClient — authentification', () => {
  it('ajoute Authorization Bearer quand auth=bearer et jeton présent', async () => {
    configureHttpAuth({getBearerToken: () => 'tok-123'});
    mockFetch(async (_input, init) => {
      const h = init?.headers as Record<string, string>;
      expect(h['Authorization']).toBe('Bearer tok-123');
      return new Response('{}', {status: 200});
    });
    await http.service('payment').get('/me', {auth: 'bearer'});
  });

  it('ajoute X-Access-Proof quand auth=accessProof', async () => {
    configureHttpAuth({getAccessProof: () => 'proof-xyz'});
    mockFetch(async (_input, init) => {
      const h = init?.headers as Record<string, string>;
      expect(h['X-Access-Proof']).toBe('proof-xyz');
      return new Response('{}', {status: 200});
    });
    await http.service('community').get('/conversations');
  });

  it('omet l\'en-tête si le fournisseur renvoie null', async () => {
    configureHttpAuth({getAccessProof: () => null});
    mockFetch(async (_input, init) => {
      const h = init?.headers as Record<string, string>;
      expect(h['X-Access-Proof']).toBeUndefined();
      return new Response('{}', {status: 200});
    });
    await http.service('community').get('/x');
  });

  it('les en-têtes appelant n\'écrasent pas Authorization / X-Access-Proof (casse)', async () => {
    configureHttpAuth({
      getBearerToken: () => 'real-token',
      getAccessProof: () => 'real-proof',
    });
    mockFetch(async (_input, init) => {
      const h = init?.headers as Record<string, string>;
      expect(h['Authorization']).toBe('Bearer real-token');
      expect(h['X-Access-Proof']).toBe('real-proof');
      expect(Object.keys(h).some(k => k.toLowerCase() === 'authorization' && h[k] === 'evil')).toBe(false);
      return new Response('{}', {status: 200});
    });
    await http.service('payment').get('/me', {
      auth: 'bearer',
      headers: {
        authorization: 'evil',
        'X-Access-Proof': 'evil',
        'x-access-proof': 'evil2',
        'X-Payment-Tracking-Token': 'track-1',
      },
    });
  });

  it('accepte X-Payment-Tracking-Token en en-tête additionnel', async () => {
    mockFetch(async (_input, init) => {
      const h = init?.headers as Record<string, string>;
      expect(h['X-Payment-Tracking-Token']).toBe('track-abc');
      return new Response('{}', {status: 200});
    });
    await http.service('payment').post('/register', {a: 1}, {
      headers: {'X-Payment-Tracking-Token': 'track-abc'},
    });
  });

  it('community utilise accessProof par défaut', async () => {
    configureHttpAuth({getAccessProof: () => 'c-proof'});
    mockFetch(async (_input, init) => {
      const h = init?.headers as Record<string, string>;
      expect(h['X-Access-Proof']).toBe('c-proof');
      return new Response('{}', {status: 200});
    });
    await http.service('community').get('/home');
  });
});

describe('httpClient — corps et FormData', () => {
  it('envoie un corps JSON avec Content-Type application/json', async () => {
    mockFetch(async (_input, init) => {
      const h = init?.headers as Record<string, string>;
      expect(h['Content-Type']).toBe('application/json');
      expect(init?.body).toBe(JSON.stringify({x: 1}));
      return new Response('{}', {status: 200});
    });
    await http.service('shop').post('/cart', {x: 1});
  });

  it('FormData : pas de Content-Type posé à la main', async () => {
    const fd = new FormData();
    fd.append('file', 'blob');
    mockFetch(async (_input, init) => {
      const h = init?.headers as Record<string, string>;
      expect(h['Content-Type']).toBeUndefined();
      expect(init?.body).toBe(fd);
      return new Response('{}', {status: 200});
    });
    await http.service('marketplace').postForm('/upload', fd, {auth: 'accessProof'});
  });

  it('GET n\'envoie pas de corps', async () => {
    mockFetch(async (_input, init) => {
      expect(init?.body).toBeUndefined();
      return new Response('{}', {status: 200});
    });
    await http.service('payment').get('/x', {body: {a: 1}});
  });
});

describe('httpClient — réponses', () => {
  it('corps vide → bodyKind empty', async () => {
    mockFetch(async () => new Response('', {status: 204}));
    const res = await http.service('shop').get('/empty');
    expect(res.bodyKind).toBe('empty');
    expect(res.body).toBeNull();
  });

  it('corps non JSON → bodyKind invalid', async () => {
    mockFetch(async () => new Response('not-json', {status: 200}));
    const res = await http.service('shop').get('/bad');
    expect(res.bodyKind).toBe('invalid');
  });

  it('renvoie HttpResponse même pour 4xx/5xx', async () => {
    mockFetch(async () =>
      new Response(JSON.stringify({success: false}), {status: 403}),
    );
    const res = await http.service('shop').get('/forbidden');
    expect(res.status).toBe(403);
    expect(res.ok).toBe(false);
  });
});

describe('httpClient — rate limit', () => {
  it('429 notifie le gate avec retryAfterSeconds du corps', async () => {
    mockFetch(async () =>
      new Response(JSON.stringify({code: 'RATE_LIMITED', retryAfterSeconds: 12}), {
        status: 429,
      }),
    );
    await http.service('community').get('/x');
    expect(isRateLimited('community')).toBe(true);
    expect(msUntilAvailable('community')).toBeGreaterThan(0);
  });

  it('RATE_LIMITED en 200 notifie aussi', async () => {
    mockFetch(async () =>
      new Response(
        JSON.stringify({success: false, code: 'RATE_LIMITED', data: {retryAfterSeconds: 5}}),
        {status: 200},
      ),
    );
    await http.service('community').get('/y');
    expect(isRateLimited('community')).toBe(true);
  });

  it('Retry-After en en-tête si corps sans secondes', async () => {
    mockFetch(async () =>
      new Response(JSON.stringify({code: 'RATE_LIMITED'}), {
        status: 429,
        headers: {'Retry-After': '8'},
      }),
    );
    await http.service('shop').get('/z');
    expect(isRateLimited('shop')).toBe(true);
  });

  it('défaut 30 s si aucune valeur', async () => {
    mockFetch(async () =>
      new Response(JSON.stringify({code: 'RATE_LIMITED'}), {status: 429}),
    );
    const before = Date.now();
    await http.service('marketplace').get('/r');
    const ms = msUntilAvailable('marketplace');
    expect(ms).toBeGreaterThan(25_000);
    expect(ms).toBeLessThanOrEqual(30_000 + 50);
    expect(before).toBeLessThanOrEqual(Date.now());
  });
});

describe('httpClient — onUnauthorized', () => {
  it('appelle onUnauthorized sur 401 si auth !== none', async () => {
    const spy = jest.fn();
    configureHttpAuth({
      getBearerToken: () => 't',
      onUnauthorized: spy,
    });
    mockFetch(async () =>
      new Response(JSON.stringify({code: 'UNAUTHORIZED'}), {status: 401}),
    );
    await http.service('payment').get('/me', {auth: 'bearer'});
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({service: 'payment', status: 401, auth: 'bearer'}),
    );
  });

  it('n\'appelle pas onUnauthorized si auth=none', async () => {
    const spy = jest.fn();
    configureHttpAuth({onUnauthorized: spy});
    mockFetch(async () => new Response('{}', {status: 401}));
    await http.service('payment').get('/public', {auth: 'none'});
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('httpClient — timeout et abort', () => {
  it('TimeoutError si le délai est dépassé', async () => {
    mockFetch(
      () =>
        new Promise(() => {
          /* never resolves */
        }) as Promise<Response>,
    );
    await expect(
      http.service('payment').get('/slow', {timeoutMs: 30}),
    ).rejects.toBeInstanceOf(TimeoutError);
  });

  it('RequestAbortedError si le signal appelant est aborté', async () => {
    const controller = new AbortController();
    mockFetch(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          const signal = init?.signal;
          if (signal?.aborted) {
            reject(Object.assign(new Error('Aborted'), {name: 'AbortError'}));
            return;
          }
          signal?.addEventListener('abort', () => {
            reject(Object.assign(new Error('Aborted'), {name: 'AbortError'}));
          });
        }) as Promise<Response>,
    );
    const promise = http.service('payment').get('/x', {signal: controller.signal, timeoutMs: 5000});
    controller.abort();
    await expect(promise).rejects.toBeInstanceOf(RequestAbortedError);
  });

  it('DEFAULT_TIMEOUT_MS vaut 20000 (choix technique)', () => {
    expect(DEFAULT_TIMEOUT_MS).toBe(20_000);
  });
});

describe('httpClient — panne réseau', () => {
  it('NetworkError si fetch rejette', async () => {
    mockFetch(async () => {
      throw new TypeError('Network request failed');
    });
    await expect(http.service('payment').get('/x')).rejects.toBeInstanceOf(
      NetworkError,
    );
  });
});

describe('prepareRequest', () => {
  it('retourne la même url et les mêmes headers qu\'une requête réelle', async () => {
    configureHttpAuth({getAccessProof: () => 'p'});
    let captured: {url: string; headers: Record<string, string>} | null = null;
    mockFetch(async (input, init) => {
      captured = {
        url: String(input),
        headers: init?.headers as Record<string, string>,
      };
      return new Response('{}', {status: 200});
    });
    const prepared = prepareRequest('community', '/conv', {
      query: {page: 1},
      headers: {'X-Custom': '1'},
    });
    await http.service('community').get('/conv', {
      query: {page: 1},
      headers: {'X-Custom': '1'},
    });
    expect(captured).not.toBeNull();
    expect(prepared.url).toBe(captured!.url);
    expect(prepared.headers['X-Access-Proof']).toBe('p');
    expect(prepared.headers['X-Custom']).toBe('1');
  });
});

describe('httpClient — aucun console', () => {
  it('n\'appelle aucun console.* pendant une requête', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockFetch(async () => new Response('{}', {status: 200}));
    await http.service('shop').get('/x');
    expect(log).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    log.mockRestore();
    warn.mockRestore();
    error.mockRestore();
  });
});
