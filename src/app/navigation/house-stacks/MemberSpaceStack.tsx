/**
 * Pile Espace membre : Accueil et pièces réelles, enveloppées par le shell.
 */

import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useTranslation} from '@shared/i18n';
import {MemberHomeScreen} from '@features/member-space/rooms/home/screens/MemberHomeScreen';
import {MemberSubscriptionScreen} from '@features/member-space/rooms/subscription/screens/MemberSubscriptionScreen';
import {MemberPaymentHistoryScreen} from '@features/member-space/rooms/payment-history/screens/MemberPaymentHistoryScreen';
import {MemberReferralScreen} from '@features/member-space/rooms/referral/screens/MemberReferralScreen';
import {MemberWithdrawalsScreen} from '@features/member-space/rooms/withdrawals/screens/MemberWithdrawalsScreen';
import {MemberDsiHoldingsScreen} from '@features/member-space/rooms/dsi/screens/MemberDsiHoldingsScreen';
import {MemberProfileScreen} from '@features/member-space/rooms/profile/screens/MemberProfileScreen';
import {MemberNotificationsScreen} from '@features/member-space/rooms/notifications/screens/MemberNotificationsScreen';
import {MemberSettingsScreen} from '@features/member-space/rooms/settings/screens/MemberSettingsScreen';
import {MemberSpaceShell} from '@features/member-space/shell/components/MemberSpaceShell';

export type MemberSpaceStackParamList = {
  MemberHome: undefined;
  MemberSubscription: undefined;
  MemberDsiHoldings: undefined;
  MemberWithdrawals: undefined;
  MemberPayments: undefined;
  MemberReferral: undefined;
  MemberNotifications: undefined;
  MemberProfile: undefined;
  MemberSettings: undefined;
};

const Stack = createNativeStackNavigator<MemberSpaceStackParamList>();

function withShell(Screen: React.ComponentType): React.FC {
  return function Shelled() {
    return (
      <MemberSpaceShell>
        <Screen />
      </MemberSpaceShell>
    );
  };
}

const Home = withShell(MemberHomeScreen);

export function MemberSpaceStack() {
  const {t} = useTranslation();
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="MemberHome" component={Home} />
      <Stack.Screen
        name="MemberSubscription"
        options={{headerShown: false}}
        children={() => (
          <MemberSpaceShell>
            <MemberSubscriptionScreen />
          </MemberSpaceShell>
        )}
      />
      <Stack.Screen
        name="MemberDsiHoldings"
        options={{headerShown: false}}
        children={() => (
          <MemberSpaceShell>
            <MemberDsiHoldingsScreen />
          </MemberSpaceShell>
        )}
      />
      <Stack.Screen
        name="MemberWithdrawals"
        options={{headerShown: false}}
        children={() => (
          <MemberSpaceShell>
            <MemberWithdrawalsScreen />
          </MemberSpaceShell>
        )}
      />
      <Stack.Screen
        name="MemberPayments"
        options={{headerShown: false}}
        children={() => (
          <MemberSpaceShell>
            <MemberPaymentHistoryScreen />
          </MemberSpaceShell>
        )}
      />
      <Stack.Screen
        name="MemberReferral"
        options={{headerShown: false}}
        children={() => (
          <MemberSpaceShell>
            <MemberReferralScreen />
          </MemberSpaceShell>
        )}
      />
      <Stack.Screen
        name="MemberNotifications"
        options={{headerShown: false}}
        children={() => (
          <MemberSpaceShell>
            <MemberNotificationsScreen />
          </MemberSpaceShell>
        )}
      />
      <Stack.Screen
        name="MemberProfile"
        options={{headerShown: false}}
        children={() => (
          <MemberSpaceShell>
            <MemberProfileScreen />
          </MemberSpaceShell>
        )}
      />
      <Stack.Screen
        name="MemberSettings"
        options={{headerShown: true, title: t('rooms.settings')}}
        children={() => (
          <MemberSpaceShell>
            <MemberSettingsScreen />
          </MemberSpaceShell>
        )}
      />
    </Stack.Navigator>
  );
}
