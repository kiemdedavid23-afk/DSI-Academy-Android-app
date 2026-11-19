/**
 * Illustrations sombres de la Marketplace (site : mpVisuals.artFor). Un même
 * texte donne toujours la même illustration. Les fichiers sont ceux du site.
 */

import type {ImageSourcePropType} from 'react-native';

const ART: ImageSourcePropType[] = [
  require('../../../assets/images/marketplace/mp-art-1.jpg'),
  require('../../../assets/images/marketplace/mp-art-2.jpg'),
  require('../../../assets/images/marketplace/mp-art-3.jpg'),
  require('../../../assets/images/marketplace/mp-art-4.jpg'),
];

export function artIndex(seed: string | null | undefined): number {
  const text = String(seed ?? '');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash % ART.length;
}

export function artFor(seed: string | null | undefined): ImageSourcePropType {
  return ART[artIndex(seed)];
}

/** Illustration d'indice fixe (cartes d'ambiance des sections). */
export function artForIndex(index: number): ImageSourcePropType {
  return ART[((index % ART.length) + ART.length) % ART.length];
}
