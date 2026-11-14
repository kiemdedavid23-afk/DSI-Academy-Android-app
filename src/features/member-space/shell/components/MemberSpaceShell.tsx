/**
 * Coquille Espace membre : fond photo fixe + en-tête + tiroir.
 * Le fond member-bg.webp couvre TOUT l'Espace membre (has-member-bg).
 * object-position 25% 45% approximé via Image resizeMode + transform.
 */

import React, {useCallback, useState} from 'react';
import {View, Image, StyleSheet, Dimensions} from 'react-native';
import {useNavigation, useNavigationState} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useTheme} from '@shared/designsystem';
import {MemberHeader} from './MemberHeader';
import {MemberDrawer, type MemberRoomId} from './MemberDrawer';
import type {MemberSpaceStackParamList} from '@app/navigation/house-stacks/MemberSpaceStack';

type Nav = NativeStackNavigationProp<MemberSpaceStackParamList>;

const BG = require('@assets/images/member-bg.webp');

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
  const isDark =
    colors.bgApp === '#0B1120' || colors.bgApp.toLowerCase() === '#0b1120';

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

  // object-position 25% 45% : RN n'a pas object-position.
  // On place l'image en cover et on décale légèrement vers la gauche/haut.
  const {width: W, height: H} = Dimensions.get('window');

  return (
    <View style={styles.fill}>
      {/* Fond photo plein écran, sous tout le contenu */}
      <Image
        source={BG}
        style={[
          styles.bg,
          {
            width: W * 1.15,
            height: H * 1.15,
            left: -W * 0.08, // ~25% bias
            top: -H * 0.05,
          },
        ]}
        resizeMode="cover"
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      {/* Assombrissement thème sombre ≈ brightness(0.8) */}
      {isDark ? (
        <View
          style={[styles.bgOverlay, {backgroundColor: 'rgba(0,0,0,0.20)'}]}
          pointerEvents="none"
        />
      ) : null}

      <View style={styles.content} pointerEvents="box-none">
        <MemberHeader
          showMenu
          onOpenDrawer={() => setDrawerOpen(true)}
          onOpenNotifications={() => navigateRoom('notifications')}
        />
        <View style={[styles.fill, {backgroundColor: 'transparent'}]}>
          {children}
        </View>
      </View>

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
  bg: {
    position: 'absolute',
    zIndex: 0,
  },
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
});
