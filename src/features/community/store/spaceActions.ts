/**
 * Rejoindre, quitter, créer un espace (C5). Rien n'est rejoué automatiquement.
 * Après un succès : liste des espaces, détail et liste des discussions relus.
 */

import {
  createSpace,
  joinSpace,
  leaveSpace,
  SPACE_DESCRIPTION_MAX_LENGTH,
  SPACE_NAME_MAX_LENGTH,
} from '@core/api/endpoints/community/spaces.api';
import {conversationsStore} from './conversationsStore';
import {failureKey} from './communityErrorKeys';
import {spaceStore} from './spaceStore';
import {spacesStore} from './spacesStore';

export {SPACE_DESCRIPTION_MAX_LENGTH, SPACE_NAME_MAX_LENGTH};

export type SpaceActionResult = {ok: true} | {ok: false; errorKey: string};

function refreshAfterChange(id: string): void {
  void spacesStore.reload();
  void spaceStore.reload(id);
  void conversationsStore.load({force: true});
}

export async function joinSpaceAction(id: string): Promise<SpaceActionResult> {
  const res = await joinSpace(id);
  if (res.kind !== 'success') {
    // Espace privé : on le dit comme sur le site, pas par le message générique.
    if (res.code === 'ACCESS_DENIED') {
      return {ok: false, errorKey: 'communityApp.spaces.private'};
    }
    return {ok: false, errorKey: failureKey(res)};
  }
  refreshAfterChange(id);
  return {ok: true};
}

export async function leaveSpaceAction(id: string): Promise<SpaceActionResult> {
  const res = await leaveSpace(id);
  if (res.kind !== 'success') {
    // Le propriétaire ne peut pas quitter son espace (le bouton n'est pas proposé).
    if (res.code === 'ACCESS_DENIED') {
      return {ok: false, errorKey: 'communityApp.spaces.ownerCannotLeave'};
    }
    return {ok: false, errorKey: failureKey(res)};
  }
  refreshAfterChange(id);
  return {ok: true};
}

export type CreateSpaceResult =
  | {ok: true; id: string; name: string}
  | {ok: false; errorKey: string};

export async function createSpaceAction(input: {
  name: string;
  description: string;
}): Promise<CreateSpaceResult> {
  const name = input.name.trim();
  if (!name || name.length > SPACE_NAME_MAX_LENGTH) {
    return {ok: false, errorKey: 'communityApp.spaces.nameRequired'};
  }
  const description = input.description.trim().slice(0, SPACE_DESCRIPTION_MAX_LENGTH);
  const res = await createSpace({name, description});
  if (res.kind !== 'success') {
    return {
      ok: false,
      errorKey:
        res.code === 'VALIDATION'
          ? 'communityApp.spaces.nameRequired'
          : failureKey(res),
    };
  }
  void spacesStore.reload();
  void conversationsStore.load({force: true});
  return {ok: true, id: res.id, name};
}
