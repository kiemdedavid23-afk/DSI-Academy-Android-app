import {http} from '@core/network';
import {sessionStore} from '@core/session';
import {
  createCommunityProfile,
  deleteCommunityAvatar,
  updateCommunityProfile,
  updateCommunityPseudonym,
  uploadCommunityAvatar,
} from '@core/api/endpoints/community/profile.api';
import created from '../contracts/community/profile.created.json';
import uploaded from '../contracts/community/avatar.uploaded.json';
import deleted from '../contracts/community/avatar.deleted.json';
import taken from '../contracts/community/error.409.pseudonymTaken.json';
import tooLarge from '../contracts/community/error.413.avatarTooLarge.json';

jest.mock('@core/network', () => ({
  http: {service: jest.fn()},
  safeEnvelope: jest.requireActual('@core/network/envelope').safeEnvelope,
}));
jest.mock('@core/session', () => ({
  sessionStore: {getAccessProof: jest.fn()},
}));

const mockPost = jest.fn();
const mockPatch = jest.fn();
const mockPostForm = jest.fn();
const mockDelete = jest.fn();
const res = (status: number, body: unknown) =>
  Promise.resolve({
    status,
    ok: status >= 200 && status < 300,
    body,
    bodyKind: 'json' as const,
  });

beforeEach(() => {
  [mockPost, mockPatch, mockPostForm, mockDelete].forEach(m => m.mockReset());
  (http.service as jest.Mock).mockReturnValue({
    post: mockPost,
    patch: mockPatch,
    postForm: mockPostForm,
    delete: mockDelete,
  });
  (sessionStore.getAccessProof as jest.Mock).mockReturnValue('proof.sig');
});

describe('Communauté : création du profil', () => {
  it('envoie nom et visibilité ; pseudonyme absent = généré par le Worker', async () => {
    mockPost.mockReturnValue(res(201, created));
    const r = await createCommunityProfile({
      displayName: 'Awa Diallo',
      pseudonym: '',
      discoverable: true,
    });
    expect(r.kind === 'success' && r.profile.publicPseudonym).toBe('@awa_diallo');
    expect(mockPost).toHaveBeenCalledWith(
      '/api/community/me/profile',
      {displayName: 'Awa Diallo', discoverable: true},
      {auth: 'accessProof'},
    );
  });
  it('pseudonyme pris : code et champ conservés', async () => {
    mockPost.mockReturnValue(res(409, taken));
    const r = await createCommunityProfile({displayName: 'Awa', pseudonym: 'awa'});
    expect(r.kind === 'failure' && r.errorKind).toBe('conflict');
    expect(r.kind === 'failure' && r.field).toBe('pseudonym');
  });
  it('sans preuve : échec local, aucun appel', async () => {
    (sessionStore.getAccessProof as jest.Mock).mockReturnValue(null);
    const r = await createCommunityProfile({displayName: 'Awa'});
    expect(r.kind === 'failure' && r.errorKind).toBe('noProof');
    expect(mockPost).not.toHaveBeenCalled();
  });
});

describe('Communauté : modification', () => {
  it('nom et visibilité : seuls les champs fournis partent', async () => {
    mockPatch.mockReturnValue(res(200, uploaded));
    await updateCommunityProfile({displayName: 'Awa D.'});
    expect(mockPatch).toHaveBeenCalledWith(
      '/api/community/me/profile',
      {displayName: 'Awa D.'},
      {auth: 'accessProof'},
    );
  });
  it('pseudonyme : route dédiée', async () => {
    mockPatch.mockReturnValue(res(200, uploaded));
    await updateCommunityPseudonym('awa2');
    expect(mockPatch).toHaveBeenCalledWith(
      '/api/community/me/pseudonym',
      {pseudonym: 'awa2'},
      {auth: 'accessProof'},
    );
  });
});

describe('Communauté : photo', () => {
  it('envoi en multipart, champ file, adresses de la réponse', async () => {
    mockPostForm.mockReturnValue(res(200, uploaded));
    const r = await uploadCommunityAvatar({
      uri: 'file:///tmp/a.jpg',
      name: 'a.jpg',
      type: 'image/jpeg',
    });
    expect(r.kind === 'success' && r.profile.avatarUrl).toContain('/full?');
    const [path, form, opts] = mockPostForm.mock.calls[0];
    expect(path).toBe('/api/community/me/avatar');
    expect(form).toBeInstanceOf(FormData);
    expect(opts.auth).toBe('accessProof');
    expect(opts.timeoutMs).toBeGreaterThan(20_000);
  });
  it('photo trop lourde : code AVATAR_TOO_LARGE, champ file', async () => {
    mockPostForm.mockReturnValue(res(413, tooLarge));
    const r = await uploadCommunityAvatar({uri: 'x', name: 'a', type: 'image/jpeg'});
    expect(r.kind === 'failure' && r.code).toBe('AVATAR_TOO_LARGE');
    expect(r.kind === 'failure' && r.field).toBe('file');
  });
  it('suppression : profil sans photo en réponse', async () => {
    mockDelete.mockReturnValue(res(200, deleted));
    const r = await deleteCommunityAvatar();
    expect(r.kind === 'success' && r.profile.avatarUrl).toBeNull();
    expect(mockDelete).toHaveBeenCalledWith('/api/community/me/avatar', {
      auth: 'accessProof',
    });
  });
  it('profil absent de la réponse : contrat inattendu', async () => {
    mockDelete.mockReturnValue(res(200, {success: true, data: {deleted: true}}));
    const r = await deleteCommunityAvatar();
    expect(r.kind === 'failure' && r.errorKind).toBe('invalidResponse');
  });
});
