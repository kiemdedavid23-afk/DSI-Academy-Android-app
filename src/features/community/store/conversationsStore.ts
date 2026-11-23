/** Liste des conversations (C4). Pas de compteur de non lus côté Worker (rapport §5). */

import {listConversations} from '@core/api/endpoints/community/conversations.api';
import type {ConversationSummary} from '@core/api/endpoints/community/conversations.types';
import {isRateLimited} from '@core/network';
import {createResourceStore, storeRegistry} from '@shared/store';

const TTL_MS = 10_000;

async function loadConversations(): Promise<ConversationSummary[]> {
  const res = await listConversations();
  if (res.kind !== 'success') {
    throw new Error(res.code ?? res.errorKind);
  }
  return res.items;
}

export const conversationsStore = createResourceStore<ConversationSummary[]>({
  ttlMs: TTL_MS,
  fetcher: loadConversations,
});

storeRegistry.register(conversationsStore);

/** Relecture périodique : en pause tant que le Worker limite le débit. */
export function refreshConversations(): void {
  if (isRateLimited('community')) {
    return;
  }
  void conversationsStore.load({force: true});
}
