/**
 * Les quatre maisons (site : houseVisuals.js). Seule la Bibliothèque est
 * ouverte en L4d ; les autres arrivent avec leurs lots (L5, L6).
 */

import type {IconName} from '@shared/designsystem';

export type HouseId = 'library' | 'videos' | 'formations' | 'audio';

export type HouseDef = {
  id: HouseId;
  nameKey: string;
  taglineKey: string;
  icon: IconName;
  image: number;
  available: boolean;
};

export const HOUSE_ORDER: readonly HouseId[] = [
  'library',
  'videos',
  'formations',
  'audio',
];

export const HOUSES: Record<HouseId, HouseDef> = {
  library: {
    id: 'library',
    nameKey: 'houses.library',
    taglineKey: 'content.taglines.library',
    icon: 'BookIcon',
    image: require('@assets/images/academy/house-library.webp'),
    available: true,
  },
  videos: {
    id: 'videos',
    nameKey: 'houses.videos',
    taglineKey: 'content.taglines.videos',
    icon: 'VideoIcon',
    image: require('@assets/images/academy/house-videos.webp'),
    available: true,
  },
  formations: {
    id: 'formations',
    nameKey: 'houses.formations',
    taglineKey: 'content.taglines.formations',
    icon: 'GraduationIcon',
    image: require('@assets/images/academy/house-formations.webp'),
    available: true,
  },
  audio: {
    id: 'audio',
    nameKey: 'houses.audio',
    taglineKey: 'content.taglines.audio',
    icon: 'HeadphonesIcon',
    image: require('@assets/images/academy/house-audio.webp'),
    available: true,
  },
};

export const HERO_IMAGE = require('@assets/images/academy/hub-hero.webp');

/** Le « reprendre » ne mène à une fiche que si l'entrée est un contenu du Worker. */
export function continueContentId(entry: {id: string; house: string} | null): number | null {
  if (!entry || !['library', 'audio', 'videos', 'formations'].includes(entry.house)) {
    return null;
  }
  return /^\d+$/.test(entry.id) && Number(entry.id) > 0 ? Number(entry.id) : null;
}
