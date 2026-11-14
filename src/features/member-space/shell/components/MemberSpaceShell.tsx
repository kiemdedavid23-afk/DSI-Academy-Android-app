/**
 * Coquille Espace membre : fond photo fixe (cover, focal 25%/45%) + en-tête + tiroir.
 * Le fond couvre TOUT l'Espace membre. Écrans enfants en transparent.
 */

import React, {useCallback, useMemo, useState} from 'react';
import {View, Image, StyleSheet, useWindowDimensions} from 'react-native';
import {useNavigation, useNavigationState} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useTheme} from '@shared/designsystem';
import {MemberHeader} from './MemberHeader';
import {MemberDrawer, type MemberRoomId} from './MemberDrawer';
import type {MemberSpaceStackParamList} from '@app/navigation/house-stacks/MemberSpaceStack';

type Nav = NativeStackNavigationProp<MemberSpaceStackParamList>;

const BG = require('@assets/images/member-bg.webp');

// Dimensions connues du fichier member-bg.webp (site public/)
const IMG_W = 1200;
const IMG_H = 800;

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

/**
 * Calcule left/top pour un cover avec point focal (fx, fy) en fractions 0–1.
 * object-position: 25% 45% → fx=0.25, fy=0.45
 */
function coverFocal(
  screenW: number,
  screenH: number,
  imgW: number,
  imgH: number,
  fx: number,
  fy: number,
): {width: number; height: number; left: number; top: number} {
  const scale = Math.max(screenW / imgW, screenH / imgH);
  const w = imgW * scale;
  const h = imgH * scale;
  // Le point focal de l'image doit coincider avec le point focal de l'écran
  const left = screenW * fx - w * fx;
  const top = screenH * fy - h * fy;
  return {width: w, height: h, left, top};
}

export function MemberSpaceShell({children}: Props) {
  const {colors, isDark} = useTheme();
  const navigation = useNavigation<Nav>();
  const {width: screenW, height: screenH} = useWindowDimensions();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const routeName = useNavigationState(state => {
    const route = state?.routes[state.index];
    return route?.name ?? 'MemberHome';
  });
  const activeRoom: MemberRoomId = ROUTE_TO_ROOM[routeName] ?? 'home';

  const bgLayout = useMemo(
    () => coverFocal(screenW, screenH, IMG_W, IMG_H, 0.25, 0.45),
    [screenW, screenH],
  );

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
    <View style={styles.fill}>
      <Image
        source={BG}
        style={[
          styles.bg,
          {
            width: bgLayout.width,
            height: bgLayout.height,
            left: bgLayout.left,
            top: bgLayout.top,
          },
        ]}
        resizeMode="stretch"
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
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
