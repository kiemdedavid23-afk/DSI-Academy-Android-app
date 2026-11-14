/**
 * Navigation membre : 5 onglets bas + pile « Plus » pour le reste.
 * Entrées calquées sur MEMBER_ROOMS du site.
 */

import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {Icon, useTheme, type IconName} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {PlaceholderScreen} from './PlaceholderScreen';
import {SettingsScreen} from '@features/member-space/rooms/settings/screens/SettingsScreen';

export type MemberTabParamList = {
  Home: undefined;
  Dsi: undefined;
  Notifications: undefined;
  Profile: undefined;
  More: undefined;
};

export type MoreStackParamList = {
  MoreHome: undefined;
  Subscription: undefined;
  Withdrawals: undefined;
  Payments: undefined;
  Referral: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<MemberTabParamList>();
const MoreStack = createNativeStackNavigator<MoreStackParamList>();

function MoreNavigator() {
  const {t} = useTranslation();
  return (
    <MoreStack.Navigator>
      <MoreStack.Screen
        name="MoreHome"
        options={{title: t('cm.nav.more')}}
        children={() => (
          <PlaceholderScreen titleKey="cm.nav.more" testID="screen-more" />
        )}
      />
      <MoreStack.Screen
        name="Subscription"
        options={{title: t('rooms.subscription')}}
        children={() => (
          <PlaceholderScreen
            titleKey="rooms.subscription"
            testID="screen-subscription"
          />
        )}
      />
      <MoreStack.Screen
        name="Withdrawals"
        options={{title: t('rooms.withdrawals')}}
        children={() => (
          <PlaceholderScreen
            titleKey="rooms.withdrawals"
            testID="screen-withdrawals"
          />
        )}
      />
      <MoreStack.Screen
        name="Payments"
        options={{title: t('rooms.payments')}}
        children={() => (
          <PlaceholderScreen
            titleKey="rooms.payments"
            testID="screen-payments"
          />
        )}
      />
      <MoreStack.Screen
        name="Referral"
        options={{title: t('rooms.referral')}}
        children={() => (
          <PlaceholderScreen
            titleKey="rooms.referral"
            testID="screen-referral"
          />
        )}
      />
      <MoreStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{title: t('rooms.settings')}}
      />
    </MoreStack.Navigator>
  );
}

function tabIcon(name: IconName) {
  return function TabBarIcon({color, size}: {color: string; size: number}) {
    return <Icon name={name} color={color} size={size} />;
  };
}

export function MemberTabs() {
  const {t} = useTranslation();
  const {colors} = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: colors.blueActive,
        tabBarInactiveTintColor: colors.textMuted,
      }}>
      <Tab.Screen
        name="Home"
        options={{
          title: t('rooms.home'),
          tabBarLabel: t('rooms.home'),
          tabBarIcon: tabIcon('HomeIcon'),
        }}
        children={() => (
          <PlaceholderScreen titleKey="rooms.home" testID="screen-home" />
        )}
      />
      <Tab.Screen
        name="Dsi"
        options={{
          title: t('rooms.dsiHoldings'),
          tabBarLabel: t('rooms.dsiHoldings'),
          tabBarIcon: tabIcon('DsiIcon'),
        }}
        children={() => (
          <PlaceholderScreen
            titleKey="rooms.dsiHoldings"
            testID="screen-dsi"
          />
        )}
      />
      <Tab.Screen
        name="Notifications"
        options={{
          title: t('rooms.notifications'),
          tabBarLabel: t('rooms.notifications'),
          tabBarIcon: tabIcon('BellIcon'),
        }}
        children={() => (
          <PlaceholderScreen
            titleKey="rooms.notifications"
            testID="screen-notifications"
          />
        )}
      />
      <Tab.Screen
        name="Profile"
        options={{
          title: t('rooms.profile'),
          tabBarLabel: t('rooms.profile'),
          tabBarIcon: tabIcon('UserIcon'),
        }}
        children={() => (
          <PlaceholderScreen
            titleKey="rooms.profile"
            testID="screen-profile"
          />
        )}
      />
      <Tab.Screen
        name="More"
        component={MoreNavigator}
        options={{
          headerShown: false,
          title: t('cm.nav.more'),
          tabBarLabel: t('cm.nav.more'),
          tabBarIcon: tabIcon('SettingsIcon'),
        }}
      />
    </Tab.Navigator>
  );
}
