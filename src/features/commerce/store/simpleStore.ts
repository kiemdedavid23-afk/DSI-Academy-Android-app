/**
 * Mini-store observable (compatible useSyncExternalStore) : l'état est
 * remplacé par un nouvel objet à chaque changement, jamais muté.
 * Copie de features/content/store/simpleStore.ts (R-LAY-4 : une feature
 * n'importe pas une autre feature).
 */

type Listener = () => void;

export type SimpleStore<S> = {
  getState: () => S;
  setState: (patch: Partial<S>) => void;
  replace: (next: S) => void;
  subscribe: (listener: Listener) => () => void;
};

export function createSimpleStore<S extends object>(initial: S): SimpleStore<S> {
  let state = initial;
  const listeners = new Set<Listener>();
  const emit = () => listeners.forEach(l => l());
  return {
    getState: () => state,
    setState: patch => {
      state = {...state, ...patch};
      emit();
    },
    replace: next => {
      state = next;
      emit();
    },
    subscribe: listener => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
