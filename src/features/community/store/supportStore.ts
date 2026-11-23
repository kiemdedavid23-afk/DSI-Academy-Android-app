/**
 * Fil Support DSI (C6) : un seul fil par membre. Messages du plus ancien au
 * plus récent (le Worker renvoie l'ordre inverse : normalisé au mapper),
 * fusion par identifiant, relecture au premier plan, envoi idempotent.
 *
 * Idempotence : chaque texte à envoyer porte un `messageId`. Si l'envoi échoue,
 * le même texte renvoyé reprend le même `messageId` : pas de doublon côté
 * Support. Seul cas de rejeu automatique de tout le lot : une seule reprise
 * après un échec réseau, avec ce même `messageId` (rapport §8.3).
 */

import {createStore} from 'zustand/vanilla';
import {
  fetchSupportMessages,
  openSupport,
  sendSupportMessage,
  SUPPORT_MESSAGE_ID_MAX_LENGTH,
  SUPPORT_MESSAGE_MAX_LENGTH,
} from '@core/api/endpoints/community/support.api';
import {sortSupport} from '@core/api/endpoints/community/support.mapper';
import type {SupportMessage} from '@core/api/endpoints/community/support.types';
import {isRateLimited} from '@core/network';
import {storeRegistry} from '@shared/store';
import {failureKey} from './communityErrorKeys';

export const SUPPORT_PAGE_SIZE = 50;

export type SupportState = {
  status: 'loading' | 'ready' | 'error';
  messages: SupportMessage[];
  hasMore: boolean;
  loadingOlder: boolean;
  sending: boolean;
  noticeKey: string | null;
  errorKey: string | null;
};

const INITIAL: SupportState = {
  status: 'loading',
  messages: [],
  hasMore: false,
  loadingOlder: false,
  sending: false,
  noticeKey: null,
  errorKey: null,
};

const store = createStore<SupportState>(() => ({...INITIAL}));

/** Dernière tentative d'envoi : même texte = même `messageId`. */
let attempt: {id: string; text: string} | null = null;

export function newMessageId(): string {
  const id = `app_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
  return id.slice(0, SUPPORT_MESSAGE_ID_MAX_LENGTH);
}

export function mergeSupport(current: SupportMessage[], incoming: SupportMessage[]): SupportMessage[] {
  const map = new Map(current.map(m => [m.id, m]));
  incoming.forEach(m => map.set(m.id, m));
  return sortSupport([...map.values()]);
}

export const supportStore = {
  getState: () => store.getState(),
  subscribe: (listener: () => void) => store.subscribe(listener),

  /** Ouvre le fil (le crée au premier accès), puis lit la dernière page. */
  async open(): Promise<void> {
    if (store.getState().status !== 'ready') {
      store.setState({...INITIAL});
    }
    const thread = await openSupport();
    if (thread.kind !== 'success') {
      store.setState({status: 'error', errorKey: failureKey(thread)});
      return;
    }
    const res = await fetchSupportMessages({limit: SUPPORT_PAGE_SIZE});
    if (res.kind !== 'success') {
      store.setState({status: 'error', errorKey: failureKey(res)});
      return;
    }
    store.setState(s => ({
      status: 'ready',
      messages: mergeSupport(s.messages, res.items),
      hasMore: res.items.length >= SUPPORT_PAGE_SIZE,
      errorKey: null,
    }));
  },

  /** Relit la dernière page et fusionne ; les échecs sont silencieux. */
  async poll(): Promise<void> {
    if (store.getState().status !== 'ready' || isRateLimited('community')) {
      return;
    }
    const res = await fetchSupportMessages({limit: SUPPORT_PAGE_SIZE});
    if (res.kind !== 'success') {
      return;
    }
    store.setState(s => ({messages: mergeSupport(s.messages, res.items)}));
  },

  async loadOlder(): Promise<void> {
    const {loadingOlder, hasMore, messages} = store.getState();
    if (loadingOlder || !hasMore || messages.length === 0) {
      return;
    }
    store.setState({loadingOlder: true, noticeKey: null});
    const res = await fetchSupportMessages({
      limit: SUPPORT_PAGE_SIZE,
      before: messages[0].createdAt,
    });
    if (res.kind !== 'success') {
      store.setState({loadingOlder: false, noticeKey: failureKey(res)});
      return;
    }
    store.setState(s => ({
      loadingOlder: false,
      hasMore: res.items.length >= SUPPORT_PAGE_SIZE,
      messages: mergeSupport(s.messages, res.items),
    }));
  },

  async send(rawText: string): Promise<{ok: true} | {ok: false; errorKey: string}> {
    const text = rawText.trim();
    if (!text || text.length > SUPPORT_MESSAGE_MAX_LENGTH || store.getState().sending) {
      return {ok: false, errorKey: 'communityApp.errors.validation'};
    }
    const current = attempt && attempt.text === text ? attempt : {id: newMessageId(), text};
    attempt = current;
    store.setState({sending: true, noticeKey: null});

    let res = await sendSupportMessage(current.id, text);
    // Un seul rejeu, seulement après un échec réseau, avec le même messageId.
    if (res.kind === 'failure' && res.errorKind === 'network') {
      res = await sendSupportMessage(current.id, text);
    }
    if (res.kind !== 'success') {
      const errorKey = failureKey(res);
      // `attempt` est conservé : le même texte renvoyé reprend le même messageId.
      store.setState({sending: false, noticeKey: errorKey});
      return {ok: false, errorKey};
    }
    attempt = null;
    store.setState(s => ({
      sending: false,
      messages: mergeSupport(s.messages, [res.message]),
    }));
    void supportStore.poll();
    return {ok: true};
  },

  reset(): void {
    attempt = null;
    store.setState({...INITIAL});
  },
};

storeRegistry.register({reset: supportStore.reset});
