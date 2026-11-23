/**
 * Discussions ouvertes (C4) : messages fusionnés par identifiant, page
 * précédente à la demande, envoi, interrogation. Une entrée par conversation,
 * purgée à la déconnexion (R-SEC-4).
 */

import {createStore} from 'zustand/vanilla';
import {fetchMessages, MESSAGE_MAX_LENGTH, sendMessage} from '@core/api/endpoints/community/conversations.api';
import {sortMessages} from '@core/api/endpoints/community/conversations.mapper';
import type {ChatMessage} from '@core/api/endpoints/community/conversations.types';
import {isRateLimited} from '@core/network';
import {storeRegistry} from '@shared/store';
import {failureKey} from './communityErrorKeys';

export const CHAT_PAGE_SIZE = 50;

export type ChatState = {
  status: 'loading' | 'ready' | 'error' | 'denied';
  messages: ChatMessage[];
  hasMore: boolean;
  loadingOlder: boolean;
  sending: boolean;
  /** Message d'erreur affiché sous la liste (envoi, page précédente). */
  noticeKey: string | null;
  errorKey: string | null;
};

type State = {chats: Record<string, ChatState>};

const store = createStore<State>(() => ({chats: {}}));

const EMPTY: ChatState = {
  status: 'loading',
  messages: [],
  hasMore: false,
  loadingOlder: false,
  sending: false,
  noticeKey: null,
  errorKey: null,
};

/** Fusion par identifiant, ordre chronologique. */
export function mergeById(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const map = new Map(current.map(m => [m.id, m]));
  incoming.forEach(m => map.set(m.id, m));
  return sortMessages([...map.values()]);
}

function patch(id: string, change: Partial<ChatState>): void {
  store.setState(s => ({
    chats: {...s.chats, [id]: {...(s.chats[id] ?? EMPTY), ...change}},
  }));
}

export const chatStore = {
  getState: () => store.getState(),
  subscribe: (listener: () => void) => store.subscribe(listener),

  async open(id: string): Promise<void> {
    const current = store.getState().chats[id];
    if (!current || current.status !== 'ready') {
      patch(id, {...EMPTY});
    }
    const res = await fetchMessages(id, {limit: CHAT_PAGE_SIZE});
    if (res.kind !== 'success') {
      patch(id, {
        status: res.code === 'ACCESS_DENIED' ? 'denied' : 'error',
        errorKey: failureKey(res),
      });
      return;
    }
    patch(id, {
      status: 'ready',
      messages: mergeById(current?.messages ?? [], res.items),
      hasMore: res.items.length >= CHAT_PAGE_SIZE,
      errorKey: null,
    });
  },

  /** Relit la dernière page et fusionne ; les échecs sont silencieux. */
  async poll(id: string): Promise<void> {
    const current = store.getState().chats[id];
    if (!current || current.status !== 'ready' || isRateLimited('community')) {
      return;
    }
    const res = await fetchMessages(id, {limit: CHAT_PAGE_SIZE});
    if (res.kind !== 'success') {
      return;
    }
    const latest = store.getState().chats[id];
    if (!latest) {
      return;
    }
    patch(id, {messages: mergeById(latest.messages, res.items)});
  },

  async loadOlder(id: string): Promise<void> {
    const current = store.getState().chats[id];
    if (!current || current.loadingOlder || !current.hasMore || current.messages.length === 0) {
      return;
    }
    patch(id, {loadingOlder: true, noticeKey: null});
    const res = await fetchMessages(id, {
      limit: CHAT_PAGE_SIZE,
      before: current.messages[0].createdAt,
    });
    const latest = store.getState().chats[id] ?? current;
    if (res.kind !== 'success') {
      patch(id, {loadingOlder: false, noticeKey: failureKey(res)});
      return;
    }
    patch(id, {
      loadingOlder: false,
      hasMore: res.items.length >= CHAT_PAGE_SIZE,
      messages: mergeById(latest.messages, res.items),
    });
  },

  /**
   * Envoi : jamais rejoué automatiquement (non idempotent). En cas d'échec le
   * texte reste dans la saisie ; le message envoyé est ajouté avec l'`id` et le
   * `createdAt` reçus, puis la page est relue.
   */
  async send(
    id: string,
    rawText: string,
    authorId: string,
  ): Promise<{ok: true} | {ok: false; errorKey: string}> {
    const text = rawText.trim();
    const current = store.getState().chats[id];
    if (!text || text.length > MESSAGE_MAX_LENGTH || current?.sending) {
      return {ok: false, errorKey: 'communityApp.errors.validation'};
    }
    patch(id, {sending: true, noticeKey: null});
    const res = await sendMessage(id, text);
    if (res.kind !== 'success') {
      const errorKey = failureKey(res);
      patch(id, {sending: false, noticeKey: errorKey});
      return {ok: false, errorKey};
    }
    const latest = store.getState().chats[id] ?? EMPTY;
    patch(id, {
      sending: false,
      messages: mergeById(latest.messages, [
        {
          id: res.id,
          authorId,
          author: null,
          kind: 'text',
          body: text,
          createdAt: res.createdAt ?? Date.now(),
        },
      ]),
    });
    void chatStore.poll(id);
    return {ok: true};
  },

  reset(): void {
    store.setState({chats: {}});
  },
};

storeRegistry.register({reset: chatStore.reset});
