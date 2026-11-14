/**
 * Pile Espace membre : Accueil réel + 8 pièces placeholder, enveloppée par le shell.
 */

import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useTranslation} from '@shared/i18n';
import {PlaceholderScreen} from '../PlaceholderScreen';
import {MemberHomeScreen} from '@features/member-space/rooms/home/screens/MemberHomeScreen';
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
        options={{headerShown: true, title: t('rooms.subscription')}}
        children={() => (
          <MemberSpaceShell>
            <PlaceholderScreen titleKey="rooms.subscription" testID="screen-subscription" />
          </MemberSpaceShell>
        )}
      />
      <Stack.Screen
        name="MemberDsiHoldings"
        options={{headerShown: true, title: t('rooms.dsiHoldings')}}
        children={() => (
          <MemberSpaceShell>
            <PlaceholderScreen titleKey="rooms.dsiHoldings" testID="screen-dsi" />
          </MemberSpaceShell>
        )}
      />
      <Stack.Screen
        name="MemberWithdrawals"
        options={{headerShown: true, title: t('rooms.withdrawals')}}
        children={() => (
          <MemberSpaceShell>
            <PlaceholderScreen titleKey="rooms.withdrawals" testID="screen-withdrawals" />
          </MemberSpaceShell>
        )}
      />
      <Stack.Screen
        name="MemberPayments"
        options={{headerShown: true, title: t('rooms.payments')}}
        children={() => (
          <MemberSpaceShell>
            <PlaceholderScreen titleKey="rooms.payments" testID="screen-payments" />
          </MemberSpaceShell>
        )}
      />
      <Stack.Screen
        name="MemberReferral"
        options={{headerShown: true, title: t('rooms.referral')}}
        children={() => (
          <MemberSpaceShell>
            <PlaceholderScreen titleKey="rooms.referral" testID="screen-referral" />
          </MemberSpaceShell>
        )}
      />
      <Stack.Screen
        name="MemberNotifications"
        options={{headerShown: true, title: t('rooms.notifications')}}
        children={() => (
          <MemberSpaceShell>
            <PlaceholderScreen titleKey="rooms.notifications" testID="screen-notifications" />
          </MemberSpaceShell>
        )}
      />
      <Stack.Screen
        name="MemberProfile"
        options={{headerShown: true, title: t('rooms.profile')}}
        children={() => (
          <MemberSpaceShell>
            <PlaceholderScreen titleKey="rooms.profile" testID="screen-profile" />
          </MemberSpaceShell>
        )}
      />
      <Stack.Screen
        name="MemberSettings"
        options={{headerShown: true, title: t('rooms.settings')}}
        children={() => (
          <MemberSpaceShell>
            <PlaceholderScreen titleKey="rooms.settings" testID="screen-settings" />
          </MemberSpaceShell>
        )}
      />
    </Stack.Navigator>
  );
}
