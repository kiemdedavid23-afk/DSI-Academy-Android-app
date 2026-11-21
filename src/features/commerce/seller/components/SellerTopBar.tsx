/**
 * Barre du haut de l'espace vendeur : logo de l'app, recherche, pastille de la
 * boutique (logo avec anneau de complétude, nom, pourcentage), cloche, avatar.
 * Elle défile avec le contenu (posée en tête de liste).
 */

import React from 'react';
import {Image, Pressable, View} from 'react-native';
import Svg, {Circle} from 'react-native-svg';
import {Icon, Text, useSellerColors, sellerMetrics} from '@shared/designsystem';

const APP_LOGO = require('@assets/images/app-icon.webp');
const RING = 32;
const STROKE = 3;

export type SellerTopBarProps = {
  storeName: string;
  logoUrl: string | null;
  /** 0 à 100 ; null = anneau masqué. */
  completionPercent: number | null;
  initial: string;
  labels: {search: string; notifications: string; account: string; store: string};
  onSearch: () => void;
  onNotifications: () => void;
  onStore: () => void;
  onAccount: () => void;
};

function Ring({percent}: {percent: number}) {
  const sellerColors = useSellerColors();
  const r = (RING - STROKE) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, percent));
  return (
    <Svg
      width={RING}
      height={RING}
      style={{position: 'absolute', left: 0, top: 0}}
      pointerEvents="none">
      <Circle
        cx={RING / 2}
        cy={RING / 2}
        r={r}
        stroke={sellerColors.border}
        strokeWidth={STROKE}
        fill="none"
      />
      <Circle
        cx={RING / 2}
        cy={RING / 2}
        r={r}
        stroke={sellerColors.accentDot}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeDasharray={`${(c * p) / 100} ${c}`}
        rotation={-90}
        origin={`${RING / 2}, ${RING / 2}`}
        fill="none"
      />
    </Svg>
  );
}

export function SellerTopBar({
  storeName,
  logoUrl,
  completionPercent,
  initial,
  labels,
  onSearch,
  onNotifications,
  onStore,
  onAccount,
}: SellerTopBarProps) {
  const sellerColors = useSellerColors();
  const size = sellerMetrics.roundButton;
  const round = {
    alignItems: 'center' as const,
    backgroundColor: sellerColors.surfaceMuted,
    borderRadius: size / 2,
    height: size,
    justifyContent: 'center' as const,
    width: size,
  };
  return (
    <View
      testID="seller-topbar"
      style={{
        alignItems: 'center',
        flexDirection: 'row',
        gap: 8,
        paddingHorizontal: sellerMetrics.margin,
        paddingVertical: 8,
      }}>
      <Image
        source={APP_LOGO}
        accessibilityIgnoresInvertColors
        style={{borderRadius: 10, height: 36, width: 36}}
      />
      <Pressable
        onPress={onSearch}
        accessibilityRole="button"
        accessibilityLabel={labels.search}
        testID="seller-topbar-search"
        style={round}>
        <Icon name="SearchIcon" size={20} color={sellerColors.ink} />
      </Pressable>
      <Pressable
        onPress={onStore}
        accessibilityRole="button"
        accessibilityLabel={labels.store}
        testID="seller-topbar-store"
        style={{
          alignItems: 'center',
          backgroundColor: sellerColors.surfaceMuted,
          borderRadius: size / 2,
          flex: 1,
          flexDirection: 'row',
          gap: 8,
          height: size,
          paddingHorizontal: 6,
        }}>
        <View style={{height: RING, width: RING}}>
          {completionPercent !== null ? <Ring percent={completionPercent} /> : null}
          <View
            style={{
              backgroundColor: sellerColors.coverSky,
              borderRadius: (RING - 2 * STROKE - 2) / 2,
              height: RING - 2 * STROKE - 2,
              left: STROKE + 1,
              overflow: 'hidden',
              position: 'absolute',
              top: STROKE + 1,
              width: RING - 2 * STROKE - 2,
            }}>
            {logoUrl ? (
              <Image
                source={{uri: logoUrl}}
                accessibilityIgnoresInvertColors
                style={{height: '100%', width: '100%'}}
              />
            ) : null}
          </View>
        </View>
        <Text
          variant="bodySmallStrong"
          numberOfLines={1}
          style={{color: sellerColors.ink, flexShrink: 1}}>
          {storeName}
        </Text>
        {completionPercent !== null ? (
          <Text variant="micro" style={{color: sellerColors.accent}}>
            {Math.round(completionPercent)} %
          </Text>
        ) : null}
        <Icon name="ChevronDownIcon" size={16} color={sellerColors.inkMuted} />
      </Pressable>
      <Pressable
        onPress={onNotifications}
        accessibilityRole="button"
        accessibilityLabel={labels.notifications}
        testID="seller-topbar-bell"
        style={round}>
        <Icon name="BellIcon" size={20} color={sellerColors.ink} />
      </Pressable>
      <Pressable
        onPress={onAccount}
        accessibilityRole="button"
        accessibilityLabel={labels.account}
        testID="seller-topbar-avatar"
        style={{...round, backgroundColor: sellerColors.coverSky}}>
        <Text variant="bodySmallStrong" style={{color: sellerColors.ink}}>
          {initial}
        </Text>
      </Pressable>
    </View>
  );
}
