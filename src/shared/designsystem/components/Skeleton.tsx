import React, {useEffect, useId, useRef, useState} from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  type DimensionValue,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';
import {useTheme} from '../theme/ThemeProvider';

export type SkeletonVariant = 'line' | 'block' | 'circle' | 'pill';
export type SkeletonTone = 'auto' | 'onDark';

export type SkeletonProps = {
  /** line (texte) · block (carte, image) · circle (avatar, icône) · pill (badge). */
  variant?: SkeletonVariant;
  width?: DimensionValue;
  height?: DimensionValue;
  /** auto : selon le thème ; onDark : sur fond sombre ou coloré. */
  tone?: SkeletonTone;
  style?: StyleProp<ViewStyle>;
};

/** Hauteur par défaut selon la forme (Skeleton.css du site). */
export function defaultSkeletonHeight(variant: SkeletonVariant): number | undefined {
  if (variant === 'line') {
    return 12;
  }
  if (variant === 'pill') {
    return 24;
  }
  return undefined;
}

/**
 * Forme de chargement : aucun texte, cachée aux lecteurs d'écran (l'annonce
 * « chargement » est faite par LoadingState). Un reflet doré la balaie, sauf si
 * « réduire les animations » est actif : le bloc reste alors immobile.
 */
export function Skeleton({
  variant = 'line',
  width,
  height,
  tone = 'auto',
  style,
}: SkeletonProps) {
  const theme = useTheme();
  const {colors, radii, motion, reduceMotion} = theme;
  const [measured, setMeasured] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;
  const gradientId = `skel${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  const base = tone === 'onDark' ? colors.skeletonBaseOnDark : colors.skeletonBase;
  const shine = tone === 'onDark' ? colors.skeletonShineOnDark : colors.skeletonShine;

  const finalHeight =
    variant === 'circle' && height === undefined ? width : height ?? defaultSkeletonHeight(variant);
  const borderRadius =
    variant === 'circle'
      ? radii.round
      : variant === 'pill'
      ? radii.pill
      : variant === 'block'
      ? radii.md
      : radii.sm;

  const animate = !reduceMotion && measured > 0;

  useEffect(() => {
    if (!animate) {
      progress.setValue(0);
      return undefined;
    }
    progress.setValue(0);
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: motion.skeletonSweepMs,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [animate, motion.skeletonSweepMs, progress]);

  const onLayout = (event: LayoutChangeEvent) => {
    const w = Math.round(event.nativeEvent.layout.width);
    setMeasured(prev => (prev === w ? prev : w));
  };

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-measured, measured],
  });

  return (
    <View
      onLayout={onLayout}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.base,
        {backgroundColor: base, borderRadius, width, height: finalHeight},
        style,
      ]}>
      {animate ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.sweep, {width: measured, transform: [{translateX}]}]}>
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={shine} stopOpacity={0} />
                <Stop offset="0.5" stopColor={shine} stopOpacity={1} />
                <Stop offset="1" stopColor={shine} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gradientId})`} />
          </Svg>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
    maxWidth: '100%',
  },
    sweep: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
