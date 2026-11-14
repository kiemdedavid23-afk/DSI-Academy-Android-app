import {connecter} from '@core/api/endpoints/payment/auth.api';
import {http} from '@core/network';
import {
  NetworkError,
  TimeoutError,
  RequestAbortedError,
} from '@core/network/errors';

jest.mock('@core/network', () => ({
  http: {
    service: jest.fn(),
  },
}));

const mockPost = jest.fn();

beforeEach(() => {
  mockPost.mockReset();
  (http.service as jest.Mock).mockReturnValue({post: mockPost});
});

describe('auth.api connecter', () => {
  it('appelle POST /api/auth/connexion sans auth, corps identifiant/motDePasse', async () => {
    mockPost.mockResolvedValue({
      status: 200,
      ok: true,
      body: {
        status: 'connecte',
        token: 'TEST_TOKEN_NOT_REAL',
        expiresIn: 604800,
        userId: 'DSI-00000',
        accessProof: null,
        subscriptionActive: true,
      },
      bodyKind: 'json',
    });

    const result = await connecter('user@test.invalid', 'secret');
    expect(http.service).toHaveBeenCalledWith('payment');
    expect(mockPost).toHaveBeenCalledWith(
      '/api/auth/connexion',
      {identifiant: 'user@test.invalid', motDePasse: 'secret'},
      {auth: 'none'},
    );
    expect(result.kind).toBe('session');
  });

  it('NetworkError → failure network', async () => {
    mockPost.mockRejectedValue(new NetworkError());
    const result = await connecter('a', 'b');
    expect(result).toEqual({kind: 'failure', errorKind: 'network'});
  });

  it('TimeoutError → failure network', async () => {
    mockPost.mockRejectedValue(new TimeoutError());
    const result = await connecter('a', 'b');
    expect(result).toEqual({kind: 'failure', errorKind: 'network'});
  });

  it('RequestAbortedError → failure network', async () => {
    mockPost.mockRejectedValue(new RequestAbortedError());
    const result = await connecter('a', 'b');
    expect(result).toEqual({kind: 'failure', errorKind: 'network'});
  });

  it('HTTP 500 → failure server', async () => {
    mockPost.mockResolvedValue({
      status: 500,
      ok: false,
      body: {erreur: 'Erreur serveur'},
      bodyKind: 'json',
    });
    const result = await connecter('a', 'b');
    expect(result).toEqual({kind: 'failure', errorKind: 'server'});
  });

  it('JSON illisible → failure server', async () => {
    mockPost.mockResolvedValue({
      status: 200,
      ok: true,
      body: null,
      bodyKind: 'invalid',
    });
    const result = await connecter('a', 'b');
    expect(result).toEqual({kind: 'failure', errorKind: 'server'});
  });

  it('HTTP 400 → failure credentials', async () => {
    mockPost.mockResolvedValue({
      status: 400,
      ok: false,
      body: {erreur: 'Format invalide'},
      bodyKind: 'json',
    });
    const result = await connecter('a', 'b');
    expect(result.kind).toBe('failure');
    if (result.kind === 'failure') {
      expect(result.errorKind).toBe('credentials');
    }
  });

  it('200 refuse → failure credentials', async () => {
    mockPost.mockResolvedValue({
      status: 200,
      ok: true,
      body: {
        status: 'refuse',
        message: 'Identifiant ou mot de passe incorrect.',
      },
      bodyKind: 'json',
    });
    const result = await connecter('a', 'b');
    expect(result.kind).toBe('failure');
    if (result.kind === 'failure') {
      expect(result.errorKind).toBe('credentials');
      expect(result.message).toContain('incorrect');
    }
  });

  it('200 suspendu → failure refused', async () => {
    mockPost.mockResolvedValue({
      status: 200,
      ok: true,
      body: {
        status: 'suspendu',
        message: 'Votre compte est actuellement suspendu.',
      },
      bodyKind: 'json',
    });
    const result = await connecter('a', 'b');
    expect(result.kind).toBe('failure');
    if (result.kind === 'failure') {
      expect(result.errorKind).toBe('refused');
    }
  });

  it('200 status inconnu → failure server', async () => {
    mockPost.mockResolvedValue({
      status: 200,
      ok: true,
      body: {status: 'autre_chose'},
      bodyKind: 'json',
    });
    const result = await connecter('a', 'b');
    expect(result).toEqual({kind: 'failure', errorKind: 'server'});
  });
});
