/**
 * Pile Espace membre : Accueil réel + 8 pièces placeholder.
 */

import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useTranslation} from '@shared/i18n';
import {PlaceholderScreen} from '../PlaceholderScreen';
import {MemberHomeScreen} from '@features/member-space/rooms/home/screens/MemberHomeScreen';

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

export function MemberSpaceStack() {
  const {t} = useTranslation();
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="MemberHome" component={MemberHomeScreen} />
      <Stack.Screen
        name="MemberSubscription"
        options={{headerShown: true, title: t('rooms.subscription')}}
        children={() => (
          <PlaceholderScreen titleKey="rooms.subscription" testID="screen-subscription" />
        )}
      />
      <Stack.Screen
        name="MemberDsiHoldings"
        options={{headerShown: true, title: t('rooms.dsiHoldings')}}
        children={() => (
          <PlaceholderScreen titleKey="rooms.dsiHoldings" testID="screen-dsi" />
        )}
      />
      <Stack.Screen
        name="MemberWithdrawals"
        options={{headerShown: true, title: t('rooms.withdrawals')}}
        children={() => (
          <PlaceholderScreen titleKey="rooms.withdrawals" testID="screen-withdrawals" />
        )}
      />
      <Stack.Screen
        name="MemberPayments"
        options={{headerShown: true, title: t('rooms.payments')}}
        children={() => (
          <PlaceholderScreen titleKey="rooms.payments" testID="screen-payments" />
        )}
      />
      <Stack.Screen
        name="MemberReferral"
        options={{headerShown: true, title: t('rooms.referral')}}
        children={() => (
          <PlaceholderScreen titleKey="rooms.referral" testID="screen-referral" />
        )}
      />
      <Stack.Screen
        name="MemberNotifications"
        options={{headerShown: true, title: t('rooms.notifications')}}
        children={() => (
          <PlaceholderScreen titleKey="rooms.notifications" testID="screen-notifications" />
        )}
      />
      <Stack.Screen
        name="MemberProfile"
        options={{headerShown: true, title: t('rooms.profile')}}
        children={() => (
          <PlaceholderScreen titleKey="rooms.profile" testID="screen-profile" />
        )}
      />
      <Stack.Screen
        name="MemberSettings"
        options={{headerShown: true, title: t('rooms.settings')}}
        children={() => (
          <PlaceholderScreen titleKey="rooms.settings" testID="screen-settings" />
        )}
      />
    </Stack.Navigator>
  );
}
