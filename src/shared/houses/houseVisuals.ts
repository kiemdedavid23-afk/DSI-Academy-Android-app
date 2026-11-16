/**
 * Identité visuelle des quatre maisons (site : houseVisuals.js).
 * Source unique : page Academy, bandeau des maisons, cartes sans image, fiche.
 */

import type {ContentType} from '@core/utils/contentDisplay';
import type {IconName} from '../designsystem';

export type HouseId = 'library' | 'videos' | 'formations' | 'audio';

/** Format du média : livre 2:3, vidéo et formation 16:9, audio carré. */
export type HouseKind = 'book' | 'video' | 'course' | 'audio';

export type HouseVisual = {
  id: HouseId;
  nameKey: string;
  taglineKey: string;
  icon: IconName;
  image: number;
  kind: HouseKind;
};

export const HOUSE_ORDER: readonly HouseId[] = [
  'library',
  'videos',
  'formations',
  'audio',
];

export const HOUSE_VISUALS: Record<HouseId, HouseVisual> = {
  library: {
    id: 'library',
    nameKey: 'houses.library',
    taglineKey: 'content.taglines.library',
    icon: 'BookIcon',
    image: require('@assets/images/academy/house-library.webp'),
    kind: 'book',
  },
  videos: {
    id: 'videos',
    nameKey: 'houses.videos',
    taglineKey: 'content.taglines.videos',
    icon: 'VideoIcon',
    image: require('@assets/images/academy/house-videos.webp'),
    kind: 'video',
  },
  formations: {
    id: 'formations',
    nameKey: 'houses.formations',
    taglineKey: 'content.taglines.formations',
    icon: 'GraduationIcon',
    image: require('@assets/images/academy/house-formations.webp'),
    kind: 'course',
  },
  audio: {
    id: 'audio',
    nameKey: 'houses.audio',
    taglineKey: 'content.taglines.audio',
    icon: 'HeadphonesIcon',
    image: require('@assets/images/academy/house-audio.webp'),
    kind: 'audio',
  },
};

export const HERO_IMAGE = require('@assets/images/academy/hub-hero.webp');

/** Maison d'un contenu, d'après son type (book → Bibliothèque, etc.). */
export function houseOfType(type: ContentType): HouseId {
  switch (type) {
    case 'audio':
      return 'audio';
    case 'video':
      return 'videos';
    case 'training':
      return 'formations';
    default:
      return 'library';
  }
}

/** Le « reprendre » ne mène à une fiche que si l'entrée est un contenu du Worker. */
export function continueContentId(
  entry: {id: string; house: string} | null,
): number | null {
  if (!entry || !(entry.house in HOUSE_VISUALS)) {
    return null;
  }
  return /^\d+$/.test(entry.id) && Number(entry.id) > 0 ? Number(entry.id) : null;
}
