/**
 * Expose les liens sociaux au shell sans import core/config dans les composants.
 */

import {SOCIAL_LINKS, type SocialLink} from '@core/config/socialLinks';

export type {SocialLink};

export const socialLinksStore = {
  list(): readonly SocialLink[] {
    return SOCIAL_LINKS;
  },
};
