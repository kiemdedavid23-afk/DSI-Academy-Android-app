/**
 * Fabrique de stores de ressource avec cache (R-DATA-3/4), basée sur Zustand.
 * État : { data, status, error, updatedAt }.
 * - TTL configurable
 * - Cache valide → pas d'appel réseau
 * - Cache expiré → affiche le cache puis rafraîchit en arrière-plan
 * - Dédoublonnage des requêtes en cours
 * - invalidate / reset / purge
 * - Erreur de rafraîchissement : conserve le cache et expose l'erreur
 *
 * La fabrique reçoit un fetcher ; elle n'importe aucune API métier.
 */

import {createStore, type StoreApi} from 'zustand/vanilla';
import {storeRegistry} from './storeRegistry';

export type ResourceStatus = 'idle' | 'loading' | 'success' | 'error';

export type ResourceState<T> = {
  data: T | null;
  status: ResourceStatus;
  error: string | null;
  updatedAt: number | null;
};

export type CreateResourceStoreOptions<T> = {
  /** Durée de validité du cache en ms. */
  ttlMs: number;
  /** Charge les données. L'outil n'importe aucune API. */
  fetcher: () => Promise<T>;
  /** Horloge injectable (tests). */
  now?: () => number;
};

type InternalState<T> = ResourceState<T> & {
  inFlight: Promise<void> | null;
  load: (options?: {force?: boolean}) => Promise<void>;
  invalidate: () => void;
  reset: () => void;
  purge: () => void;
};

export type ResourceStore<T> = {
  getState: () => ResourceState<T>;
  subscribe: (listener: (state: ResourceState<T>, prev: ResourceState<T>) => void) => () => void;
  load: (options?: {force?: boolean}) => Promise<void>;
  invalidate: () => void;
  reset: () => void;
  purge: () => void;
  /** Accès au store Zustand sous-jacent (tests / hooks futurs). */
  api: StoreApi<InternalState<T>>;
};

function toPublic<T>(state: InternalState<T>): ResourceState<T> {
  return {
    data: state.data,
    status: state.status,
    error: state.error,
    updatedAt: state.updatedAt,
  };
}

export function createResourceStore<T>(
  options: CreateResourceStoreOptions<T>,
): ResourceStore<T> {
  const clock = options.now ?? (() => Date.now());
  // Incrémenté à chaque reset/purge : une réponse arrivée après une purge
  // (déconnexion) est ignorée et ne remet jamais les données de l'ancienne session.
  let generation = 0;

  const api = createStore<InternalState<T>>((set, get) => {
    const isFresh = (): boolean => {
      const {updatedAt, data} = get();
      if (updatedAt == null || data == null) {
        return false;
      }
      return clock() - updatedAt < options.ttlMs;
    };

    const runFetch = async (background: boolean): Promise<void> => {
      const startedIn = generation;
      if (!background) {
        set({status: 'loading', error: null});
      }
      try {
        const data = await options.fetcher();
        if (startedIn !== generation) {
          return;
        }
        set({
          data,
          status: 'success',
          error: null,
          updatedAt: clock(),
        });
      } catch (err) {
        if (startedIn !== generation) {
          return;
        }
        const message =
          err instanceof Error ? err.message : 'Erreur de chargement';
        const {data} = get();
        if (data != null) {
          set({status: 'error', error: message});
        } else {
          set({status: 'error', error: message, data: null});
        }
      }
    };

    return {
      data: null,
      status: 'idle',
      error: null,
      updatedAt: null,
      inFlight: null,

      load: async (opts?: {force?: boolean}) => {
        const force = opts?.force === true;
        if (!force && isFresh()) {
          return;
        }
        const current = get();
        if (current.inFlight) {
          await current.inFlight;
          return;
        }
        const background = !force && current.data != null;
        const promise: Promise<void> = runFetch(background).finally(() => {
          if (get().inFlight === promise) {
            set({inFlight: null});
          }
        });
        set({inFlight: promise});
        await promise;
      },

      invalidate: () => {
        set({updatedAt: null});
      },

      reset: () => {
        generation += 1;
        set({
          data: null,
          status: 'idle',
          error: null,
          updatedAt: null,
          inFlight: null,
        });
      },

      purge: () => {
        get().reset();
      },
    };
  });

  const store: ResourceStore<T> = {
    getState: () => toPublic(api.getState()),
    subscribe: listener =>
      api.subscribe((state, prev) => listener(toPublic(state), toPublic(prev))),
    load: opts => api.getState().load(opts),
    invalidate: () => api.getState().invalidate(),
    reset: () => api.getState().reset(),
    purge: () => api.getState().purge(),
    api,
  };

  storeRegistry.register(store);
  return store;
}
