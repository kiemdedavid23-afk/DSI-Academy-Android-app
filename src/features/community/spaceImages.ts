/** Visuels des cartes et du héros d'un espace (site : /community/space-1 à 3.webp). */

export const SPACE_IMAGES = [
  require('@assets/images/space-1.webp'),
  require('@assets/images/space-2.webp'),
  require('@assets/images/space-3.webp'),
];

/** Même image pour un même espace, d'une liste à son détail (site : somme des codes). */
export function spaceImageFor(id: string) {
  const sum = [...id].reduce((total, ch) => total + ch.charCodeAt(0), 0);
  return SPACE_IMAGES[sum % SPACE_IMAGES.length];
}
