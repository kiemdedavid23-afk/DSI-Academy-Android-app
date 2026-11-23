/** Création de discussions (C4). Après un succès, la liste est relue. */

import {
  createDirectConversation,
  createGroupConversation,
} from '@core/api/endpoints/community/conversations.api';
import {conversationsStore} from './conversationsStore';
import {failureKey} from './communityErrorKeys';

export type OpenChatResult =
  | {ok: true; id: string}
  | {ok: false; errorKey: string};

/** Ouvre (ou crée) la discussion privée avec un contact : une seule par paire. */
export async function startDirectChat(userId: string): Promise<OpenChatResult> {
  const res = await createDirectConversation(userId);
  if (res.kind !== 'success') {
    return {ok: false, errorKey: failureKey(res)};
  }
  void conversationsStore.load({force: true});
  return {ok: true, id: res.id};
}

export const GROUP_TITLE_MAX_LENGTH = 80;

export async function createGroupChat(
  title: string,
  memberIds: string[],
): Promise<OpenChatResult> {
  const res = await createGroupConversation(title.trim(), memberIds);
  if (res.kind !== 'success') {
    return {ok: false, errorKey: failureKey(res)};
  }
  void conversationsStore.load({force: true});
  return {ok: true, id: res.id};
}
