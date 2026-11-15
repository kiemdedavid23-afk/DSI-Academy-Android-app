/** Aides Range pour la reprise d'un fichier temporaire (lecteur de livres). */

export function buildRangeHeader(start: number, end?: number): string {
  const from = Math.max(0, Math.floor(start));
  return end === undefined
    ? `bytes=${from}-`
    : `bytes=${from}-${Math.floor(end)}`;
}

export type ResumePlan =
  | {action: 'complete'}
  | {action: 'restart'}
  | {action: 'resume'; startByte: number};

/**
 * Que faire d'un fichier temporaire partiel :
 * - tout est déjà là (taille connue atteinte) → terminé ;
 * - rien de téléchargé → on repart de zéro ;
 * - la source ne gère pas Range → on repart de zéro ;
 * - sinon → on reprend à l'octet suivant.
 */
export function planResume(input: {
  downloadedBytes: number;
  totalBytes: number | null;
  rangeSupported: boolean;
}): ResumePlan {
  const {downloadedBytes, totalBytes, rangeSupported} = input;
  if (totalBytes !== null && downloadedBytes > totalBytes) {
    return {action: 'restart'};
  }
  if (totalBytes !== null && downloadedBytes === totalBytes && totalBytes > 0) {
    return {action: 'complete'};
  }
  if (downloadedBytes <= 0 || !rangeSupported) {
    return {action: 'restart'};
  }
  return {action: 'resume', startByte: downloadedBytes};
}
