import {loadTrace} from './loadTrace';

type ProgressReader = (requestId: string) => Promise<{loaded: number; total: number}>;

/**
 * Pendant un téléchargement natif, lit toutes les 200 ms les octets reçus et
 * l'alimente dans le chronomètre de chargement. Renvoie la fonction d'arrêt.
 * Sans module natif à jour (lecteur absent), rien ne se passe.
 */
export function pollProgress(requestId: string, read: ProgressReader | undefined): () => void {
  if (!read) {
    return () => undefined;
  }
  let alive = true;
  const timer = setInterval(() => {
    read(requestId)
      .then(p => {
        if (alive && p && p.total > 0) {
          loadTrace.setProgress((p.loaded / p.total) * 100);
        }
      })
      .catch(() => undefined);
  }, 200);
  return () => {
    alive = false;
    clearInterval(timer);
  };
}
