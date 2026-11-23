import {http} from '@core/network';
import {sessionStore} from '@core/session';
import {fetchCommunityMe} from '@core/api/endpoints/community/me.api';
import withProfile from '../contracts/community/me.withProfile.json';
import subInactive from '../contracts/community/error.403.subscriptionInactive.json';

jest.mock('@core/network', () => ({
  http: {service: jest.fn()},
  safeEnvelope: jest.requireActual('@core/network/envelope').safeEnvelope,
}));
jest.mock('@core/session', () => ({
  sessionStore: {getAccessProof: jest.fn()},
}));

const mockGet = jest.fn();
const res = (status: number, body: unknown) =>
  Promise.resolve({
    status,
    ok: status >= 200 && status < 300,
    body,
    bodyKind: 'json' as const,
  });

beforeEach(() => {
  mockGet.mockReset();
  (http.service as jest.Mock).mockReturnValue({get: mockGet});
  (sessionStore.getAccessProof as jest.Mock).mockReturnValue('proof.sig');
});

describe('Communauté : GET /me', () => {
  it('appelle le service community en accessProof, chemin relatif', async () => {
    mockGet.mockReturnValue(res(200, withProfile));
    const r = await fetchCommunityMe();
    expect(r.kind).toBe('success');
    expect(http.service).toHaveBeenCalledWith('community');
    expect(mockGet).toHaveBeenCalledWith('/api/community/me', {
      auth: 'accessProof',
    });
  });
  it('sans preuve : échec local, aucun appel réseau', async () => {
    (sessionStore.getAccessProof as jest.Mock).mockReturnValue(null);
    const r = await fetchCommunityMe();
    expect(r.kind === 'failure' && r.errorKind).toBe('noProof');
    expect(mockGet).not.toHaveBeenCalled();
  });
  it('erreur métier : code conservé', async () => {
    mockGet.mockReturnValue(res(403, subInactive));
    const r = await fetchCommunityMe();
    expect(r.kind === 'failure' && r.code).toBe('SUBSCRIPTION_INACTIVE');
  });
  it('réseau coupé : échec réseau, pas d’exception', async () => {
    const {NetworkError} = jest.requireActual('@core/network/errors');
    mockGet.mockReturnValue(Promise.reject(new NetworkError()));
    const r = await fetchCommunityMe();
    expect(r.kind === 'failure' && r.errorKind).toBe('network');
  });
});
