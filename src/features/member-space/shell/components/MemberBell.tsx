/**
 * Cloche en-tête — chemins SVG exacts du site + pastille MemberBell.css.
 */

import React from 'react';
import {View, Pressable, StyleSheet} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import {Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {useUnreadNotifications} from '@shared/store';

type Props = {
  onPress: () => void;
};

export function MemberBell({onPress}: Props) {
  const {t} = useTranslation();
  const {colors} = useTheme();
  const unread = useUnreadNotifications();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('rooms.notifications')}
      hitSlop={8}
      style={styles.wrap}
      testID="member-bell"
      android_ripple={{color: colors.bgSurfaceAlt, borderless: true}}>
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path
          d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2z"
          stroke={colors.textPrimary}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M10 21h4"
          stroke={colors.textPrimary}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
      {unread > 0 ? (
        <View
          style={[
            styles.badge,
            {
              backgroundColor: colors.goldPrestige,
              borderColor: colors.bgSurface,
            },
          ]}>
          <Text
            style={[
              styles.badgeText,
              {color: colors.bgDarkPremium, fontFamily: 'Manrope-Bold'},
            ]}>
            {unread > 9 ? '9+' : String(unread)}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    padding: 4,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10.9, // 0.68rem
    fontWeight: '700',
    lineHeight: 14,
    textAlign: 'center',
  },
});
