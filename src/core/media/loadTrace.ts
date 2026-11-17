/**
 * Chronomètre des étapes d'ouverture d'un contenu (lien du Worker, ouverture chez
 * la source, mise en mémoire tampon, première page). Aucune adresse ni donnée
 * du contenu : seulement des durées. Sert à l'écran de chargement et au
 * message récapitulatif de fin de chargement.
 */

export type TraceId = 'link' | 'open' | 'buffer' | 'render';

export type TraceSnapshot = {
  kind: string;
  startedAt: number;
  steps: ReadonlyArray<{id: TraceId; ms: number}>;
  currentId: TraceId | null;
  currentSince: number;
  finishedAt: number | null;
  failed: boolean;
  /** Avancement réel de l'étape en cours, de 0 à 100, ou null si inconnu. */
  progress: number | null;
};

const IDLE: TraceSnapshot = {
  kind: '',
  startedAt: 0,
  steps: [],
  currentId: null,
  currentSince: 0,
  finishedAt: null,
  failed: false,
  progress: null,
};

let snap: TraceSnapshot = IDLE;
const listeners = new Set<() => void>();
const finishListeners = new Set<(s: TraceSnapshot) => void>();

function set(next: TraceSnapshot) {
  snap = next;
  listeners.forEach(l => l());
}

export const loadTrace = {
  get: (): TraceSnapshot => snap,
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  /** Reçoit le bilan à la fin d'un chargement (réussi ou en échec). */
  onFinish: (l: (s: TraceSnapshot) => void) => {
    finishListeners.add(l);
    return () => {
      finishListeners.delete(l);
    };
  },
  /** Démarre un chargement : la première étape est la demande du lien. */
  begin: (kind: string) => {
    const now = Date.now();
    set({...IDLE, kind, startedAt: now, currentId: 'link', currentSince: now});
  },
  /** Clôt l'étape en cours et ouvre la suivante. */
  step: (id: TraceId) => {
    if (snap.currentId === null || snap.finishedAt !== null || snap.currentId === id) {
      return;
    }
    const now = Date.now();
    set({
      ...snap,
      steps: [...snap.steps, {id: snap.currentId, ms: now - snap.currentSince}],
      currentId: id,
      currentSince: now,
      progress: null,
    });
  },
  /** Avancement réel (octets reçus / octets attendus). Sans effet si aucun chargement en cours. */
  setProgress: (percent: number | null) => {
    if (snap.currentId === null || snap.finishedAt !== null) {
      return;
    }
    const next = percent === null ? null : Math.max(0, Math.min(100, Math.round(percent)));
    if (next !== snap.progress) {
      set({...snap, progress: next});
    }
  },
  /** Termine le chargement. `only` : ne termine que si cette étape est en cours. */
  finish: (failed = false, only?: TraceId) => {
    if (snap.currentId === null || snap.finishedAt !== null) {
      return;
    }
    if (only !== undefined && snap.currentId !== only) {
      return;
    }
    const now = Date.now();
    const done: TraceSnapshot = {
      ...snap,
      steps: [...snap.steps, {id: snap.currentId, ms: now - snap.currentSince}],
      currentId: null,
      finishedAt: now,
      failed,
    };
    set(done);
    finishListeners.forEach(l => l(done));
  },
};

export function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)} s`;
}
