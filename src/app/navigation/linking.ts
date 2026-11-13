/**
 * Table des liens profonds (R-NAV-4). Minimale pour L0d.
 */

import type {LinkingOptions} from '@react-navigation/native';

export const linking: LinkingOptions<Record<string, object | undefined>> = {
  prefixes: ['dsiacademy://'],
  config: {
    screens: {
      Login: 'connexion',
      RegisterBrowser: 'inscription',
      Home: 'member-space',
      Dsi: 'member-space/dsi-holdings',
      Notifications: 'member-space/notifications',
      Profile: 'member-space/profile',
      More: {
        screens: {
          MoreHome: 'member-space/more',
          Subscription: 'member-space/subscription',
          Withdrawals: 'member-space/withdrawals',
          Payments: 'member-space/payments',
          Referral: 'member-space/referral',
          Settings: 'member-space/settings',
        },
      },
    },
  },
};
