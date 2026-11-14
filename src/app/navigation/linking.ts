/**
 * Table des liens profonds (R-NAV-4). Minimale pour L0d.
 * Les types viennent des listes de routes des navigateurs : la pile « Plus »
 * est imbriquée dans l'onglet « More ».
 */

import type {
  LinkingOptions,
  NavigatorScreenParams,
} from '@react-navigation/native';
import type {AuthStackParamList} from './AuthStack';
import type {MemberTabParamList, MoreStackParamList} from './MemberTabs';

export type RootParamList = AuthStackParamList &
  Omit<MemberTabParamList, 'More'> & {
    More: NavigatorScreenParams<MoreStackParamList>;
  };

export const linking: LinkingOptions<RootParamList> = {
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
