/**
 * Bannière in-app générique (overlay). Composant PUR : il reçoit la bannière
 * et le rappel de fermeture en props, sans dépendre d'aucun store (R-LAY-3).
 * Le branchement sur bannerStore se fait dans le shell.
 * Glisse depuis le haut + fondu ; respect reduceMotion.
 */

import React, {useEffect, useRef} from 'react';
import {
  View,
  Pressable,
  Animated,
  Image,
  StyleSheet,
  Platform,
  AccessibilityInfo,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Text} from './Text';
import {Icon} from '../icons';
import {useTheme} from '../theme';

const APP_ICON = require('@assets/images/app-icon.png');

export type InAppBannerTone = 'warning' | 'success' | 'info' | 'error';

export type InAppBannerData = {
  id: string;
  tone: InAppBannerTone;
  /** Texte déjà traduit. */
  title: string;
  /** Texte déjà traduit. */
  message: string;
  dismissible: boolean;
  /** ms ; absent = jusqu'à fermeture manuelle. */
  autoHideMs?: number;
};

type Props = {
  /** Bannière à afficher, ou null. */
  banner: InAppBannerData | null;
  onDismiss: (id: string) => void;
  /** Libellé accessible du bouton de fermeture (déjà traduit). */
  dismissLabel: string;
  /** Décalage sous l'en-tête (ex. 64 + safe). 0 = sous barre d'état. */
  topOffset?: number;
};

function toneColors(
  tone: InAppBannerTone,
  colors: ReturnType<typeof useTheme>['colors'],
): {border: string; iconBg: string; icon: string} {
  switch (tone) {
    case 'warning':
      return {
        border: colors.warning,
        iconBg: colors.warningBg,
        icon: colors.warning,
      };
    case 'success':
      return {
        border: colors.success,
        iconBg: colors.successBg,
        icon: colors.success,
      };
    case 'error':
      return {
        border: colors.error,
        iconBg: colors.errorBg,
        icon: colors.error,
      };
    default:
      return {
        border: colors.info,
        iconBg: colors.infoBg,
        icon: colors.info,
      };
  }
}

export function InAppBanner({
  banner,
  onDismiss,
  dismissLabel,
  topOffset = 0,
}: Props) {
  const {colors, elevation, radii, reduceMotion} = useTheme();
  const insets = useSafeAreaInsets();

  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const announcedId = useRef<string | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }

    if (!banner) {
      if (reduceMotion) {
        translateY.setValue(-80);
        opacity.setValue(0);
      } else {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -80,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
      return;
    }

    if (reduceMotion) {
      translateY.setValue(0);
      opacity.setValue(1);
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }

    // Annonce a11y une seule fois par id
    if (announcedId.current !== banner.id) {
      announcedId.current = banner.id;
      AccessibilityInfo.announceForAccessibility?.(
        `${banner.title}. ${banner.message}`,
      );
    }

    if (banner.autoHideMs && banner.autoHideMs > 0) {
      hideTimer.current = setTimeout(() => {
        onDismiss(banner.id);
      }, banner.autoHideMs);
    }

    return () => {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
      }
    };
  }, [banner, onDismiss, reduceMotion, translateY, opacity]);

  if (!banner) {
    return null;
  }

  const tone = toneColors(banner.tone, colors);
  const top = insets.top + topOffset + 8;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        {
          top,
          opacity,
          transform: [{translateY}],
        },
      ]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      testID="in-app-banner">
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.bgSurface,
            borderRadius: radii.lg,
            borderLeftColor: tone.border,
            ...Platform.select({
              android: {elevation: elevation.raised},
              default: {
                shadowColor: elevation.shadowColor,
                shadowOffset: {width: 0, height: 4},
                shadowOpacity: 0.15,
                shadowRadius: 8,
              },
            }),
          },
        ]}>
        <Image
          source={APP_ICON}
          style={[styles.logo, {borderColor: tone.border}]}
          accessibilityIgnoresInvertColors
          testID="in-app-banner-logo"
        />
        <View style={styles.textCol}>
          <Text
            style={{
              fontWeight: '700',
              fontSize: 14,
              color: colors.textPrimary,
              fontFamily: 'Manrope-Bold',
            }}>
            {banner.title}
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: colors.textSecondary,
              marginTop: 2,
              lineHeight: 17,
            }}
            numberOfLines={4}>
            {banner.message}
          </Text>
        </View>
        {banner.dismissible ? (
          <Pressable
            onPress={() => onDismiss(banner.id)}
            accessibilityRole="button"
            accessibilityLabel={dismissLabel}
            hitSlop={8}
            style={styles.close}
            testID="in-app-banner-dismiss">
            <Icon name="XIcon" size={18} color={colors.textSecondary} />
          </Pressable>
        ) : (
          <View style={styles.closePlaceholder} />
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 999,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderLeftWidth: 4,
    gap: 10,
    minHeight: 56,
  },
  logo: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  close: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closePlaceholder: {
    width: 12,
  },
});
