import * as profileApi from '@core/api/endpoints/community/profile.api';
import {pickAvatar} from '@core/platform/pickAvatar';
import {communityMeStore} from '../src/shared/store/communityMeStore';
import {
  createProfile,
  pickAndUploadAvatar,
  refreshAfterImageError,
  removeAvatar,
  saveProfile,
} from '../src/shared/store/communityProfileActions';
import withProfile from '../contracts/community/me.withProfile.json';
import uploaded from '../contracts/community/avatar.uploaded.json';

jest.mock('@core/session', () => ({
  sessionStore: {
    getAccessProof: jest.fn(() => 'proof.sig'),
    getSession: jest.fn(() => ({subscriptionActive: true})),
    onSessionCleared: jest.fn(),
    expireSession: jest.fn(),
  },
}));
jest.mock('@core/api/endpoints/community/profile.api', () => ({
  createCommunityProfile: jest.fn(),
  updateCommunityProfile: jest.fn(),
  updateCommunityPseudonym: jest.fn(),
  uploadCommunityAvatar: jest.fn(),
  deleteCommunityAvatar: jest.fn(),
}));
jest.mock('@core/api/endpoints/community/me.api', () => ({
  fetchCommunityMe: jest.fn(),
}));
jest.mock('@core/platform/pickAvatar', () => ({pickAvatar: jest.fn()}));

const api = profileApi as jest.Mocked<typeof profileApi>;
const profile = withProfile.data.profile as never;
const upProfile = uploaded.data.profile as never;
const ok = (p: unknown) => ({kind: 'success' as const, profile: p as never});
const ko = (code: string, field: string | null = null) => ({
  kind: 'failure' as const,
  errorKind: 'conflict' as const,
  status: 409,
  code,
  field,
  retryAfterSeconds: null,
});

beforeEach(() => {
  jest.clearAllMocks();
  communityMeStore.reset();
});

describe('Actions du profil communautaire', () => {
  it('création : le profil du Worker est écrit dans le store', async () => {
    api.createCommunityProfile.mockResolvedValue(ok(profile));
    const r = await createProfile({displayName: 'Awa', discoverable: true});
    expect(r.ok).toBe(true);
    expect(communityMeStore.getState().data?.needsProfile).toBe(false);
    expect(communityMeStore.getState().data?.profile?.pseudonym).toBe('awa');
  });
  it('pseudonyme pris : clé de message et champ, store inchangé', async () => {
    api.createCommunityProfile.mockResolvedValue(ko('CONFLICT', 'pseudonym'));
    const r = await createProfile({displayName: 'Awa', pseudonym: 'awa', discoverable: true});
    expect(r.ok === false && r.errorKey).toBe('communityProfile.errors.pseudonymTaken');
    expect(r.ok === false && r.field).toBe('pseudonym');
    expect(communityMeStore.getState().data).toBeNull();
  });
  it('modification : nom enregistré puis pseudonyme refusé = partiel conservé', async () => {
    api.updateCommunityProfile.mockResolvedValue(ok(upProfile));
    api.updateCommunityPseudonym.mockResolvedValue(ko('CONFLICT', 'pseudonym'));
    const r = await saveProfile(profile, {displayName: 'Awa D.', pseudonym: 'awa2'});
    expect(r.ok === false && r.partialSaved).toBe(true);
    expect(communityMeStore.getState().data?.profile?.avatarFileId).toBe('av_1');
  });
  it('rien à modifier côté nom : un seul appel, pseudonyme seul', async () => {
    api.updateCommunityPseudonym.mockResolvedValue(ok(profile));
    await saveProfile(profile, {pseudonym: 'awa3'});
    expect(api.updateCommunityProfile).not.toHaveBeenCalled();
    expect(api.updateCommunityPseudonym).toHaveBeenCalledWith('awa3');
  });
});

describe('Actions : photo', () => {
  it('annulation du choix : aucun envoi', async () => {
    (pickAvatar as jest.Mock).mockResolvedValue({kind: 'cancelled'});
    const r = await pickAndUploadAvatar();
    expect(r.ok).toBe('cancelled');
    expect(api.uploadCommunityAvatar).not.toHaveBeenCalled();
  });
  it('format refusé localement : message du Worker réutilisé, aucun envoi', async () => {
    (pickAvatar as jest.Mock).mockResolvedValue({kind: 'error', code: 'AVATAR_UNSUPPORTED_TYPE'});
    const r = await pickAndUploadAvatar();
    expect(r.ok === false && r.errorKey).toBe('communityProfile.errors.avatarUnsupported');
    expect(api.uploadCommunityAvatar).not.toHaveBeenCalled();
  });
  it('envoi réussi : nouvelles adresses dans le store', async () => {
    (pickAvatar as jest.Mock).mockResolvedValue({
      kind: 'picked',
      file: {uri: 'file:///a.jpg', name: 'a.jpg', type: 'image/jpeg'},
    });
    api.uploadCommunityAvatar.mockResolvedValue(ok(upProfile));
    const r = await pickAndUploadAvatar();
    expect(r.ok).toBe(true);
    expect(communityMeStore.getState().data?.profile?.avatarUrl).toContain('/full?');
  });
  it('suppression : profil sans photo dans le store', async () => {
    api.deleteCommunityAvatar.mockResolvedValue(ok({...(profile as object), avatarUrl: null}));
    const r = await removeAvatar();
    expect(r.ok).toBe(true);
    expect(communityMeStore.getState().data?.profile?.avatarUrl).toBeNull();
  });
  it('image cassée : au plus une relecture par minute', () => {
    const {fetchCommunityMe} = jest.requireMock('@core/api/endpoints/community/me.api');
    fetchCommunityMe.mockResolvedValue({
      kind: 'success',
      me: {userId: 'DSI-0001', needsProfile: true, profile: null, communityStatus: 'INCOMPLETE'},
    });
    refreshAfterImageError();
    refreshAfterImageError();
    expect(fetchCommunityMe).toHaveBeenCalledTimes(1);
  });
});
