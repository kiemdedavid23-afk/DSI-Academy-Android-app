import * as api from '@core/api/endpoints/community/spaces.api';
import * as feed from '@core/api/endpoints/community/activity.api';
import {activityStore} from '../src/features/community/store/activityStore';
import {conversationsStore} from '../src/features/community/store/conversationsStore';
import {
  createSpaceAction,
  joinSpaceAction,
  leaveSpaceAction,
} from '../src/features/community/store/spaceActions';
import {spaceStore} from '../src/features/community/store/spaceStore';
import {cleanSpaceQuery, spacesStore} from '../src/features/community/store/spacesStore';

jest.mock('@core/network', () => ({isRateLimited: jest.fn(() => false)}));
jest.mock('@core/session', () => ({
  sessionStore: {
    getAccessProof: jest.fn(() => 'proof.sig'),
    getSession: jest.fn(() => ({subscriptionActive: true})),
    onSessionCleared: jest.fn(),
    expireSession: jest.fn(),
  },
}));
jest.mock('@core/api/endpoints/community/me.api', () => ({fetchCommunityMe: jest.fn()}));
jest.mock('@core/api/endpoints/community/spaces.api', () => ({
  SPACE_NAME_MAX_LENGTH: 80,
  SPACE_DESCRIPTION_MAX_LENGTH: 500,
  listSpaces: jest.fn(),
  fetchSpace: jest.fn(),
  createSpace: jest.fn(),
  joinSpace: jest.fn(),
  leaveSpace: jest.fn(),
}));
jest.mock('@core/api/endpoints/community/activity.api', () => ({fetchActivity: jest.fn()}));
jest.mock('@core/api/endpoints/community/conversations.api', () => ({
  MESSAGE_MAX_LENGTH: 4000,
  listConversations: jest.fn(() => Promise.resolve({kind: 'success', items: []})),
}));

const mock = api as jest.Mocked<typeof api>;
const feedMock = feed as jest.Mocked<typeof feed>;
const space = (id: string, extra = {}) => ({
  id, name: id, description: '', ownerId: 'DSI-0002', memberCount: 1, joined: false, createdAt: 1, ...extra,
});
const detail = (id: string, extra = {}) => ({
  ...space(id), visibility: 'public' as const, conversationId: null, ...extra,
});
const fail = (code: string, errorKind: 'forbidden' | 'notFound' | 'network' = 'forbidden') => ({
  kind: 'failure' as const, errorKind, status: 403, code, field: null, retryAfterSeconds: null,
});

beforeEach(() => {
  jest.clearAllMocks();
  spacesStore.reset();
  spaceStore.reset();
  activityStore.reset();
});

describe('spacesStore', () => {
  it('charge la liste ; la recherche est nettoyée avant l’appel', async () => {
    mock.listSpaces.mockResolvedValue({kind: 'success', items: [space('sp_1')]});
    await spacesStore.load('  cui   sine ');
    expect(mock.listSpaces).toHaveBeenCalledWith('cui sine');
    expect(spacesStore.getState().data?.map(s => s.id)).toEqual(['sp_1']);
    expect(spacesStore.getState().status).toBe('success');
    expect(cleanSpaceQuery('  a   b ')).toBe('a b');
  });
  it('recherche vide : aucun paramètre', async () => {
    mock.listSpaces.mockResolvedValue({kind: 'success', items: []});
    await spacesStore.load('   ');
    expect(mock.listSpaces).toHaveBeenCalledWith(undefined);
  });
  it('une réponse ancienne n’écrase pas la plus récente', async () => {
    let releaseFirst: (v: unknown) => void = () => undefined;
    mock.listSpaces
      .mockReturnValueOnce(new Promise(r => { releaseFirst = r; }) as never)
      .mockResolvedValueOnce({kind: 'success', items: [space('nouveau')]});
    const first = spacesStore.load('a');
    await spacesStore.load('ab');
    releaseFirst({kind: 'success', items: [space('ancien')]});
    await first;
    expect(spacesStore.getState().data?.map(s => s.id)).toEqual(['nouveau']);
    expect(spacesStore.getState().query).toBe('ab');
  });
  it('erreur : la liste déjà affichée est conservée, la clé de message est fournie', async () => {
    mock.listSpaces.mockResolvedValueOnce({kind: 'success', items: [space('sp_1')]});
    await spacesStore.load();
    mock.listSpaces.mockResolvedValueOnce(fail('RATE_LIMITED'));
    await spacesStore.load();
    const s = spacesStore.getState();
    expect(s.status).toBe('error');
    expect(s.data?.length).toBe(1);
    expect(s.error).toBe('communityApp.errors.rateLimited');
  });
  it('reload garde la recherche en cours ; purge vide tout', async () => {
    mock.listSpaces.mockResolvedValue({kind: 'success', items: []});
    await spacesStore.load('foto');
    await spacesStore.reload();
    expect(mock.listSpaces).toHaveBeenLastCalledWith('foto');
    spacesStore.purge();
    expect(spacesStore.getState().data).toBeNull();
    expect(spacesStore.getState().query).toBe('');
  });
});

describe('spaceStore', () => {
  it('prêt, puis relecture silencieuse sans repasser par le chargement', async () => {
    mock.fetchSpace.mockResolvedValue({kind: 'success', space: detail('sp_1')});
    await spaceStore.open('sp_1');
    expect(spaceStore.getState().spaces.sp_1.status).toBe('ready');
    const pending = spaceStore.open('sp_1');
    expect(spaceStore.getState().spaces.sp_1.status).toBe('ready');
    await pending;
  });
  it('NOT_FOUND → notFound ; ACCESS_DENIED → private', async () => {
    mock.fetchSpace
      .mockResolvedValueOnce(fail('NOT_FOUND', 'notFound'))
      .mockResolvedValueOnce(fail('ACCESS_DENIED'));
    await spaceStore.open('a');
    await spaceStore.open('b');
    expect(spaceStore.getState().spaces.a.status).toBe('notFound');
    expect(spaceStore.getState().spaces.b.status).toBe('private');
  });
  it('autre erreur : état erreur ; relecture ratée ne masque pas l’espace affiché', async () => {
    mock.fetchSpace.mockResolvedValueOnce(fail('NETWORK_ERROR', 'network'));
    await spaceStore.open('a');
    expect(spaceStore.getState().spaces.a.status).toBe('error');
    expect(spaceStore.getState().spaces.a.errorKey).toBe('communityApp.errors.network');
    mock.fetchSpace.mockResolvedValueOnce({kind: 'success', space: detail('a')});
    await spaceStore.open('a');
    mock.fetchSpace.mockResolvedValueOnce(fail('NETWORK_ERROR', 'network'));
    await spaceStore.reload('a');
    expect(spaceStore.getState().spaces.a.status).toBe('ready');
  });
  it('purge', async () => {
    mock.fetchSpace.mockResolvedValue({kind: 'success', space: detail('a')});
    await spaceStore.open('a');
    spaceStore.purge();
    expect(spaceStore.getState().spaces).toEqual({});
  });
});

describe('Actions sur les espaces', () => {
  it('rejoindre : succès relit liste, détail et discussions', async () => {
    mock.joinSpace.mockResolvedValue({kind: 'success', conversationId: 'cv_s3', already: false});
    mock.listSpaces.mockResolvedValue({kind: 'success', items: []});
    mock.fetchSpace.mockResolvedValue({kind: 'success', space: detail('sp_3')});
    const loadConversations = jest.spyOn(conversationsStore, 'load');
    const r = await joinSpaceAction('sp_3');
    expect(r).toEqual({ok: true});
    expect(mock.listSpaces).toHaveBeenCalled();
    expect(mock.fetchSpace).toHaveBeenCalledWith('sp_3');
    expect(loadConversations).toHaveBeenCalledWith({force: true});
  });
  it('rejoindre un espace privé : message « espace privé »', async () => {
    mock.joinSpace.mockResolvedValue(fail('ACCESS_DENIED'));
    expect(await joinSpaceAction('sp_p')).toEqual({ok: false, errorKey: 'communityApp.spaces.private'});
  });
  it('rejoindre avec blocage : message du Worker traduit', async () => {
    mock.joinSpace.mockResolvedValue(fail('INTERACTION_UNAVAILABLE'));
    const r = await joinSpaceAction('sp_3');
    expect(r).toEqual({ok: false, errorKey: 'communityApp.errors.interactionUnavailable'});
  });
  it('quitter : propriétaire refusé, autre erreur traduite, rien n’est relu en échec', async () => {
    mock.leaveSpace.mockResolvedValueOnce(fail('ACCESS_DENIED'));
    expect(await leaveSpaceAction('sp_1')).toEqual({
      ok: false, errorKey: 'communityApp.spaces.ownerCannotLeave',
    });
    expect(mock.listSpaces).not.toHaveBeenCalled();
  });
  it('quitter : succès', async () => {
    mock.leaveSpace.mockResolvedValue({kind: 'success'});
    mock.listSpaces.mockResolvedValue({kind: 'success', items: []});
    mock.fetchSpace.mockResolvedValue({kind: 'success', space: detail('sp_1')});
    expect(await leaveSpaceAction('sp_1')).toEqual({ok: true});
  });
  it('création : nom vide ou trop long refusé sans appel', async () => {
    const empty = await createSpaceAction({name: '   ', description: ''});
    const long = await createSpaceAction({name: 'x'.repeat(81), description: ''});
    expect(empty).toEqual({ok: false, errorKey: 'communityApp.spaces.nameRequired'});
    expect(long).toEqual({ok: false, errorKey: 'communityApp.spaces.nameRequired'});
    expect(mock.createSpace).not.toHaveBeenCalled();
  });
  it('création : champs nettoyés, description plafonnée, puis listes relues', async () => {
    mock.createSpace.mockResolvedValue({kind: 'success', id: 'sp_9', conversationId: 'cv_s9'});
    mock.listSpaces.mockResolvedValue({kind: 'success', items: []});
    const r = await createSpaceAction({name: '  Cuisine ', description: 'd'.repeat(600)});
    expect(r).toEqual({ok: true, id: 'sp_9', name: 'Cuisine'});
    expect(mock.createSpace).toHaveBeenCalledWith({name: 'Cuisine', description: 'd'.repeat(500)});
    expect(mock.listSpaces).toHaveBeenCalled();
  });
  it('création : VALIDATION du Worker → message sur le nom ; quota → message de débit', async () => {
    mock.createSpace
      .mockResolvedValueOnce({...fail('VALIDATION'), errorKind: 'validation' as const})
      .mockResolvedValueOnce({...fail('RATE_LIMITED'), errorKind: 'rateLimited' as const});
    const a = await createSpaceAction({name: 'A', description: ''});
    const b = await createSpaceAction({name: 'B', description: ''});
    expect(a).toEqual({ok: false, errorKey: 'communityApp.spaces.nameRequired'});
    expect(b).toEqual({ok: false, errorKey: 'communityApp.errors.rateLimited'});
  });
});

describe('activityStore', () => {
  it('charge le fil ; une erreur expose la clé de message', async () => {
    feedMock.fetchActivity.mockResolvedValueOnce({
      kind: 'success',
      items: [{id: 'ev_1', type: 'space.created', actorId: 'x', actorDisplayName: 'Moussa', actorPseudonym: 'moussa', createdAt: 1}],
    });
    await activityStore.load({force: true});
    expect(activityStore.getState().data?.length).toBe(1);
    activityStore.reset();
    feedMock.fetchActivity.mockResolvedValueOnce(fail('SUBSCRIPTION_INACTIVE'));
    await activityStore.load({force: true});
    expect(activityStore.getState().status).toBe('error');
    expect(activityStore.getState().error).toBe('communityApp.errors.subscriptionInactive');
  });
});
