/**
 * Liens profonds — seul endroit (R-NAV).
 * Préfixe https du site : via registre si besoin ultérieur, pas de littéral ici.
 */

import type {LinkingOptions} from '@react-navigation/native';
import type {MemberTabParamList} from './MemberTabs';

export const linking: LinkingOptions<MemberTabParamList> = {
  prefixes: ['dsiacademy://'],
  config: {
    screens: {
      Community: 'community',
      Academy: 'academy',
      MemberSpace: {
        path: 'member-space',
        screens: {
          MemberHome: '',
          MemberSubscription: 'subscription',
          MemberDsiHoldings: 'dsi-holdings',
          MemberWithdrawals: 'withdrawals',
          MemberPayments: 'payments',
          MemberReferral: 'referral',
          MemberNotifications: 'notifications',
          MemberProfile: 'profile',
          MemberSettings: 'settings',
        },
      },
      Shop: 'shop',
      Marketplace: 'marketplace',
    },
  },
};
