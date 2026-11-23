import {safeEnvelope} from '@core/network';
import {community, noProof} from './common.api';
import {
  mapCreatedSpace,
  mapJoinedSpace,
  mapLeftSpace,
  mapSpaceDetail,
  mapSpaceList,
} from './spaces.mapper';
import type {NewSpaceInput} from './spaces.types';

/**
 * Espaces (rapport §11.6). Abonnement actif requis. Création : seau `create`
 * (10 par minute). Aucune écriture n'est rejouée automatiquement.
 * Seuls les espaces publics se parcourent, se rejoignent et se créent ici :
 * un espace privé est créable côté Worker mais inutilisable (§11.6).
 */

const AUTH = {auth: 'accessProof'} as const;
const base = '/api/community/spaces';

export const SPACE_NAME_MAX_LENGTH = 80;
export const SPACE_DESCRIPTION_MAX_LENGTH = 500;

const one = (id: string) => `${base}/${encodeURIComponent(id)}`;

/** Espaces publics, triés par nombre de membres, 100 au plus. `q` : contient, sans casse. */
export async function listSpaces(q?: string) {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  return mapSpaceList(
    await safeEnvelope(
      community().get(base, {...AUTH, query: {q: q ? q : undefined}}),
    ),
  );
}

export async function fetchSpace(id: string) {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  return mapSpaceDetail(await safeEnvelope(community().get(one(id), AUTH)));
}

/** Toujours public : le privé n'est qu'un espace où le créateur est seul. */
export async function createSpace(input: NewSpaceInput) {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  const body: Record<string, unknown> = {
    name: input.name,
    visibility: 'public',
  };
  if (input.description) {
    body.description = input.description;
  }
  return mapCreatedSpace(await safeEnvelope(community().post(base, body, AUTH)));
}

export async function joinSpace(id: string) {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  return mapJoinedSpace(
    await safeEnvelope(community().post(`${one(id)}/join`, {}, AUTH)),
  );
}

export async function leaveSpace(id: string) {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  return mapLeftSpace(
    await safeEnvelope(community().post(`${one(id)}/leave`, {}, AUTH)),
  );
}
