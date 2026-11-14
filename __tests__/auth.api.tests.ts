import {connecter} from '@core/api/endpoints/payment/auth.api';
import {http} from '@core/network';

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

  it('réseau en erreur → failure', async () => {
    mockPost.mockRejectedValue(new Error('NETWORK_ERROR'));
    const result = await connecter('a', 'b');
    expect(result.kind).toBe('failure');
  });
});
