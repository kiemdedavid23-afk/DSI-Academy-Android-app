/**
 * Recherche d'un membre et fiches des membres consultés (C3).
 * Recherche : correspondance exacte (pseudonyme ou identifiant DSI), 0 ou 1
 * résultat. Fiches : une entrée par référence, rechargeable en silence.
 * Purgé à la déconnexion (R-SEC-4).
 */

import {createStore} from 'zustand/vanilla';
import {fetchMemberCard, searchMembers} from '@core/api/endpoints/community/directory.api';
import type {MemberCard} from '@core/api/endpoints/community/directory.types';
import type {CommunityPeer} from '@core/api/endpoints/community/common.types';
import {storeRegistry} from '@shared/store';
import {failureKey} from './communityErrorKeys';

export type SearchState = {
  status: 'idle' | 'loading' | 'done' | 'error';
  items: CommunityPeer[];
  errorKey: string | null;
};

export type CardEntry = {
  status: 'loading' | 'ready' | 'notFound' | 'error';
  card: MemberCard | null;
  errorKey: string | null;
};

type State = {search: SearchState; cards: Record<string, CardEntry>};

const EMPTY_SEARCH: SearchState = {status: 'idle', items: [], errorKey: null};

const store = createStore<State>(() => ({search: EMPTY_SEARCH, cards: {}}));
let searchSeq = 0;

/** Le « @ » initial est retiré ; une saisie vide ne part pas. */
export function cleanQuery(raw: string): string {
  return raw.trim().replace(/^@+/, '');
}

export const memberDirectory = {
  getState: () => store.getState(),
  subscribe: (listener: () => void) => store.subscribe(listener),

  async search(raw: string): Promise<void> {
    const q = cleanQuery(raw);
    if (!q) {
      return;
    }
    const seq = ++searchSeq;
    store.setState({search: {status: 'loading', items: [], errorKey: null}});
    const res = await searchMembers(q);
    if (seq !== searchSeq) {
      return;
    }
    if (res.kind !== 'success') {
      store.setState({
        search: {status: 'error', items: [], errorKey: failureKey(res)},
      });
      return;
    }
    store.setState({search: {status: 'done', items: res.items, errorKey: null}});
  },

  resetSearch(): void {
    searchSeq++;
    store.setState({search: EMPTY_SEARCH});
  },

  /** `silent` : recharge sans effacer la fiche affichée (après une action). */
  async loadCard(ref: string, opts: {silent?: boolean} = {}): Promise<void> {
    const current = store.getState().cards[ref];
    if (!opts.silent || !current || current.status !== 'ready') {
      store.setState(s => ({
        cards: {...s.cards, [ref]: {status: 'loading', card: null, errorKey: null}},
      }));
    }
    const res = await fetchMemberCard(ref);
    let entry: CardEntry;
    if (res.kind === 'success') {
      entry = {status: 'ready', card: res.card, errorKey: null};
    } else if (res.errorKind === 'notFound') {
      entry = {status: 'notFound', card: null, errorKey: null};
    } else {
      const keep = opts.silent && current?.status === 'ready' ? current.card : null;
      entry = {
        status: keep ? 'ready' : 'error',
        card: keep,
        errorKey: failureKey(res),
      };
    }
    store.setState(s => ({cards: {...s.cards, [ref]: entry}}));
  },

  reset(): void {
    searchSeq++;
    store.setState({search: EMPTY_SEARCH, cards: {}});
  },
};

storeRegistry.register({reset: memberDirectory.reset});
