import type {MediaSource} from './types';

/**
 * Passage de relais entre deux étapes d'une même ouverture (le lecteur de texte
 * découvre que c'est un PDF ou un document, puis le bon lecteur prend la suite) :
 * le lien déjà obtenu est réutilisé une seule fois, ce qui évite une seconde
 * requête vers le Worker. Gardé 30 secondes en mémoire, jamais sur le disque.
 */
const MAX_AGE_MS = 30_000;

let recent: {media: MediaSource; at: number} | null = null;

export function rememberMedia(media: MediaSource): void {
  recent = {media, at: Date.now()};
}

export function takeRecentMedia(contentId: number): MediaSource | null {
  const r = recent;
  recent = null;
  if (r && r.media.contentId === contentId && Date.now() - r.at <= MAX_AGE_MS) {
    return r.media;
  }
  return null;
}
