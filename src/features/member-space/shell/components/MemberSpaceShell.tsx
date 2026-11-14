/**
 * Coquille Espace membre : en-tête + tiroir autour du contenu navigué.
 * Montée depuis app/navigation (pas depuis rooms/home).
 */

import React, {useCallback, useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {useNavigation, useNavigationState} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useTheme} from '@shared/designsystem';
import {MemberHeader} from './MemberHeader';
import {MemberDrawer, type MemberRoomId} from './MemberDrawer';
import type {MemberSpaceStackParamList} from '@app/navigation/house-stacks/MemberSpaceStack';

type Nav = NativeStackNavigationProp<MemberSpaceStackParamList>;

const ROUTE_TO_ROOM: Record<string, MemberRoomId> = {
  MemberHome: 'home',
  MemberSubscription: 'subscription',
  MemberDsiHoldings: 'dsi-holdings',
  MemberWithdrawals: 'withdrawals',
  MemberPayments: 'payments',
  MemberReferral: 'referral',
  MemberNotifications: 'notifications',
  MemberProfile: 'profile',
  MemberSettings: 'settings',
};

type Props = {
  children: React.ReactNode;
};

export function MemberSpaceShell({children}: Props) {
  const {colors} = useTheme();
  const navigation = useNavigation<Nav>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const routeName = useNavigationState(state => {
    const route = state?.routes[state.index];
    return route?.name ?? 'MemberHome';
  });
  const activeRoom: MemberRoomId = ROUTE_TO_ROOM[routeName] ?? 'home';

  const navigateRoom = useCallback(
    (room: MemberRoomId) => {
      const map: Record<MemberRoomId, keyof MemberSpaceStackParamList> = {
        home: 'MemberHome',
        subscription: 'MemberSubscription',
        'dsi-holdings': 'MemberDsiHoldings',
        withdrawals: 'MemberWithdrawals',
        payments: 'MemberPayments',
        referral: 'MemberReferral',
        notifications: 'MemberNotifications',
        profile: 'MemberProfile',
        settings: 'MemberSettings',
      };
      const target = map[room];
      if (target === 'MemberHome') {
        navigation.navigate('MemberHome');
        return;
      }
      navigation.navigate(target);
    },
    [navigation],
  );

  return (
    <View style={[styles.fill, {backgroundColor: colors.bgApp}]}>
      <MemberHeader
        showMenu
        onOpenDrawer={() => setDrawerOpen(true)}
        onOpenNotifications={() => navigateRoom('notifications')}
      />
      <View style={styles.fill}>{children}</View>
      <MemberDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeRoom={activeRoom}
        onNavigateRoom={navigateRoom}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {flex: 1},
});
