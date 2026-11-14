/**
 * Liens officiels DSI Academy (mêmes URL que le site).
 * Ouverture via Linking.openURL après contrôle https (R-NET-1 : core/config).
 * href null = à venir (grisé, non cliquable).
 */

export type SocialLink = {
  id: string;
  label: string;
  /** URL https ou null si non disponible. */
  href: string | null;
};

/** Reprises telles quelles du site (app/config/socialLinks.js). */
export const SOCIAL_LINKS: SocialLink[] = [
  {
    id: 'facebook',
    label: 'Facebook',
    href: 'https://www.facebook.com/share/1GVL3d7duA/',
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    href: 'https://wa.me/22678627530',
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    href: 'https://www.tiktok.com/@dsi169',
  },
  {
    id: 'telegram',
    label: 'Telegram',
    href: null,
  },
];
