/**
 * Journal d'ouverture du lecteur audio/vidéo, affiché à l'écran pendant le
 * chargement pour voir à quelle étape ça s'arrête. Aucune adresse ni donnée du
 * contenu : seulement des étapes et des durées.
 */
const MAX_LINES = 9;
let lines: string[] = [];
let t0 = Date.now();
let last = '';
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach(l => l());
}

export const diag = {
  get: (): string[] => lines,
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  reset: () => {
    t0 = Date.now();
    last = '';
    lines = [];
    emit();
  },
  /** Ajoute une ligne (ignorée si identique à la précédente). */
  log: (msg: string) => {
    if (msg === last) {
      return;
    }
    last = msg;
    const at = ((Date.now() - t0) / 1000).toFixed(1);
    lines = [...lines, `+${at} s  ${msg}`].slice(-MAX_LINES);
    emit();
  },
};
