/**
 * En-tête Espace membre — fidélité visuelle MemberSpaceLayout.css lignes 50-180 + MemberBell.
 * Hauteur 64, fond bg-surface, bordure basse, ombre sm.
 * Hamburger 3 barres 18×2, marque app-icon 40×40, titre Fraunces 17.6, tag or, horloge, cloche.
 */

import React from 'react';
import {View, Pressable, Image, StyleSheet, Platform} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {MemberClock} from './MemberClock';
import {MemberBell} from './MemberBell';

const APP_ICON = require('@assets/images/app-icon.png');

type Props = {
  showMenu: boolean;
  onOpenDrawer: () => void;
  onOpenNotifications: () => void;
  welcomeKey?: string;
};

export function MemberHeader({
  showMenu,
  onOpenDrawer,
  onOpenNotifications,
  welcomeKey = 'houses.welcome.memberSpace',
}: Props) {
  const {t} = useTranslation();
  const {colors, elevation} = useTheme();
  const insets = useSafeAreaInsets();
  const isDark =
    colors.bgApp === '#0B1120' || colors.bgApp.toLowerCase() === '#0b1120';

  return (
    <View
      style={[
        styles.outer,
        {
          backgroundColor: colors.bgSurface,
          borderBottomColor: colors.borderLight,
          paddingTop: insets.top,
          ...Platform.select({
            android: {elevation: elevation.small},
            default: {
              shadowColor: elevation.shadowColor,
              shadowOffset: {width: 0, height: 1},
              shadowOpacity: 0.05,
              shadowRadius: 2,
            },
          }),
        },
      ]}
      testID="member-header">
      <View style={styles.row}>
        <View style={styles.left}>
          {showMenu ? (
            <Pressable
              onPress={onOpenDrawer}
              accessibilityRole="button"
              accessibilityLabel={t('houses.menuButton')}
              hitSlop={8}
              style={styles.hamburger}
              testID="member-menu"
              android_ripple={{color: colors.bgSurfaceAlt, borderless: true}}>
              <View
                style={[styles.bar, {backgroundColor: colors.textPrimary}]}
              />
              <View
                style={[styles.bar, {backgroundColor: colors.textPrimary}]}
              />
              <View
                style={[styles.bar, {backgroundColor: colors.textPrimary}]}
              />
            </Pressable>
          ) : null}

          <View style={styles.brand}>
            <Image
              source={APP_ICON}
              style={[
                styles.brandIcon,
                {
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: colors.goldBorder,
                },
              ]}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <View style={styles.brandText}>
              <Text
                style={[
                  styles.title,
                  {
                    color: isDark ? colors.titleOnDark : colors.royalStart,
                    fontFamily: 'Fraunces-Bold',
                  },
                ]}
                numberOfLines={1}>
                DSI Academy
              </Text>
              <Text
                style={[
                  styles.tag,
                  {
                    color: colors.goldText,
                    fontFamily: 'Fraunces-MediumItalic',
                  },
                ]}
                numberOfLines={1}>
                {t(welcomeKey)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.right}>
          <MemberClock />
          <View style={{width: 6}} />
          <MemberBell onPress={onOpenNotifications} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderBottomWidth: 1,
    zIndex: 100,
  },
  row: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    gap: 12,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
    flex: 1,
  },
  hamburger: {
    flexDirection: 'column',
    gap: 4,
    padding: 6,
    borderRadius: 6,
    flexShrink: 0,
  },
  bar: {
    width: 18,
    height: 2,
    borderRadius: 2,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
    flex: 1,
  },
  brandIcon: {
    width: 40,
    height: 40,
    flexShrink: 0,
  },
  brandText: {
    flexDirection: 'column',
    minWidth: 0,
    flexShrink: 1,
  },
  title: {
    fontSize: 17.6,
    fontWeight: '700',
    letterSpacing: 0.09,
    lineHeight: 20.24,
  },
  tag: {
    // site 0.76rem = 12.16 → plancher R-DS-2 = 14
    fontSize: 14,
    fontWeight: '500',
    fontStyle: 'italic',
    lineHeight: 18.2,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 6,
  },
});
