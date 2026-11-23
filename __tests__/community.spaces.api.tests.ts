import {http} from '@core/network';
import {sessionStore} from '@core/session';
import * as api from '@core/api/endpoints/community/spaces.api';
import * as feed from '@core/api/endpoints/community/activity.api';
import list from '../contracts/community/spaces.list.json';
import joined from '../contracts/community/space.detail.joined.json';
import notJoined from '../contracts/community/space.detail.notJoined.json';
import created from '../contracts/community/space.created.json';
import join from '../contracts/community/space.join.json';
import already from '../contracts/community/space.join.already.json';
import leave from '../contracts/community/space.leave.json';
import activity from '../contracts/community/activity.list.json';
import accessDenied from '../contracts/community/error.403.accessDenied.json';
import notFound from '../contracts/community/error.404.notFound.json';
import interaction from '../contracts/community/error.403.interactionUnavailable.json';

jest.mock('@core/network', () => ({
  http: {service: jest.fn()},
  safeEnvelope: jest.requireActual('@core/network/envelope').safeEnvelope,
}));
jest.mock('@core/session', () => ({sessionStore: {getAccessProof: jest.fn()}}));

const m = {get: jest.fn(), post: jest.fn()};
const res = (status: number, body: unknown) =>
  Promise.resolve({status, ok: status < 300, body, bodyKind: 'json' as const});
const AUTH = {auth: 'accessProof'};

beforeEach(() => {
  Object.values(m).forEach(f => f.mockReset());
  (http.service as jest.Mock).mockReturnValue(m);
  (sessionStore.getAccessProof as jest.Mock).mockReturnValue('proof.sig');
});

describe('Espaces : liste', () => {
  it('lit les espaces, description vide conservée, rejoint = booléen strict', async () => {
    m.get.mockReturnValue(res(200, list));
    const r = await api.listSpaces();
    expect(m.get).toHaveBeenCalledWith('/api/community/spaces', {...AUTH, query: {q: undefined}});
    expect(r.kind).toBe('success');
    if (r.kind === 'success') {
      expect(r.items.map(s => s.id)).toEqual(['sp_1', 'sp_2', 'sp_3']);
      expect(r.items[0].joined).toBe(true);
      expect(r.items[1].description).toBe('');
      expect(r.items[1].memberCount).toBe(1);
    }
  });
  it('recherche : le texte part en paramètre q', async () => {
    m.get.mockReturnValue(res(200, {success: true, data: {items: []}}));
    await api.listSpaces('cui');
    expect(m.get).toHaveBeenCalledWith('/api/community/spaces', {...AUTH, query: {q: 'cui'}});
  });
  it('éléments sans identifiant ou sans nom ignorés ; compteur absent = 0', async () => {
    m.get.mockReturnValue(
      res(200, {success: true, data: {items: [{name: 'x'}, {id: 'a'}, {id: 'b', name: 'B'}]}}),
    );
    const r = await api.listSpaces();
    expect(r.kind === 'success' && r.items).toEqual([
      {id: 'b', name: 'B', description: '', ownerId: '', memberCount: 0, joined: false, createdAt: null},
    ]);
  });
  it('contrat inattendu : échec typé, pas de plantage', async () => {
    m.get.mockReturnValue(res(200, {success: true, data: {}}));
    const r = await api.listSpaces();
    expect(r.kind === 'failure' && r.errorKind).toBe('invalidResponse');
  });
  it('sans preuve d’accès : aucun appel réseau', async () => {
    (sessionStore.getAccessProof as jest.Mock).mockReturnValue(null);
    const r = await api.listSpaces();
    expect(r.kind === 'failure' && r.errorKind).toBe('noProof');
    expect(m.get).not.toHaveBeenCalled();
  });
});

describe('Espaces : détail', () => {
  it('rejoint : conversationId présent, visibilité lue', async () => {
    m.get.mockReturnValue(res(200, joined));
    const r = await api.fetchSpace('sp_1');
    expect(m.get).toHaveBeenCalledWith('/api/community/spaces/sp_1', AUTH);
    expect(r.kind === 'success' && r.space.conversationId).toBe('cv_s1');
    expect(r.kind === 'success' && r.space.visibility).toBe('public');
  });
  it('non rejoint : conversationId null', async () => {
    m.get.mockReturnValue(res(200, notJoined));
    const r = await api.fetchSpace('sp_3');
    expect(r.kind === 'success' && r.space.conversationId).toBeNull();
  });
  it('privé non rejoint : ACCESS_DENIED ; inconnu : NOT_FOUND', async () => {
    m.get.mockReturnValueOnce(res(403, accessDenied)).mockReturnValueOnce(res(404, notFound));
    const a = await api.fetchSpace('sp_p');
    const b = await api.fetchSpace('sp_x');
    expect(a.kind === 'failure' && a.code).toBe('ACCESS_DENIED');
    expect(b.kind === 'failure' && b.code).toBe('NOT_FOUND');
  });
  it('identifiant encodé dans l’adresse', async () => {
    m.get.mockReturnValue(res(200, joined));
    await api.fetchSpace('a/b');
    expect(m.get.mock.calls[0][0]).toBe('/api/community/spaces/a%2Fb');
  });
});

describe('Espaces : écritures', () => {
  it('création : toujours public, description omise si vide', async () => {
    m.post.mockReturnValue(res(201, created));
    const a = await api.createSpace({name: 'Cuisine', description: ''});
    await api.createSpace({name: 'Photo', description: 'Partage'});
    expect(m.post).toHaveBeenNthCalledWith(
      1, '/api/community/spaces', {name: 'Cuisine', visibility: 'public'}, AUTH);
    expect(m.post.mock.calls[1][1]).toEqual({name: 'Photo', visibility: 'public', description: 'Partage'});
    expect(a.kind === 'success' && a.id).toBe('sp_9');
    expect(a.kind === 'success' && a.conversationId).toBe('cv_s9');
  });
  it('rejoindre : conversationId reçu ; déjà membre : sans conversationId', async () => {
    m.post.mockReturnValueOnce(res(200, join)).mockReturnValueOnce(res(200, already));
    const a = await api.joinSpace('sp_3');
    const b = await api.joinSpace('sp_3');
    expect(m.post).toHaveBeenCalledWith('/api/community/spaces/sp_3/join', {}, AUTH);
    expect(a.kind === 'success' && a.conversationId).toBe('cv_s3');
    expect(b.kind === 'success' && [b.already, b.conversationId]).toEqual([true, null]);
  });
  it('rejoindre : blocage avec le propriétaire', async () => {
    m.post.mockReturnValue(res(403, interaction));
    const r = await api.joinSpace('sp_3');
    expect(r.kind === 'failure' && r.code).toBe('INTERACTION_UNAVAILABLE');
  });
  it('quitter : succès ; propriétaire : ACCESS_DENIED', async () => {
    m.post.mockReturnValueOnce(res(200, leave)).mockReturnValueOnce(res(403, accessDenied));
    const a = await api.leaveSpace('sp_1');
    const b = await api.leaveSpace('sp_1');
    expect(m.post).toHaveBeenCalledWith('/api/community/spaces/sp_1/leave', {}, AUTH);
    expect(a.kind).toBe('success');
    expect(b.kind === 'failure' && b.code).toBe('ACCESS_DENIED');
  });
  it('réponse de rejoindre sans « joined » : contrat inattendu', async () => {
    m.post.mockReturnValue(res(200, {success: true, data: {}}));
    const r = await api.joinSpace('sp_3');
    expect(r.kind === 'failure' && r.errorKind).toBe('invalidResponse');
  });
});

describe('Fil d’activité', () => {
  it('deux types connus, du plus récent au plus ancien, texte serveur ignoré', async () => {
    m.get.mockReturnValue(res(200, activity));
    const r = await feed.fetchActivity();
    expect(m.get).toHaveBeenCalledWith('/api/community/activity', AUTH);
    expect(r.kind).toBe('success');
    if (r.kind === 'success') {
      expect(r.items.map(e => e.id)).toEqual(['ev_1', 'ev_2']);
      expect(r.items[1].actorDisplayName).toBe('');
      expect(r.items[1].actorPseudonym).toBe('awa');
      expect(JSON.stringify(r.items)).not.toContain('Nouvel espace');
    }
  });
  it('contrat inattendu', async () => {
    m.get.mockReturnValue(res(200, {success: true, data: {items: 'x'}}));
    const r = await feed.fetchActivity();
    expect(r.kind === 'failure' && r.errorKind).toBe('invalidResponse');
  });
});
