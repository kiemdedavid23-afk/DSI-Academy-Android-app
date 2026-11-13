import React, {useEffect, useMemo, useRef} from 'react';
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {useTheme} from '../theme/ThemeProvider';
import {
  BRAND_LOADER_CYCLE_MS,
  FADE_START_MS,
  LETTER_ORDER,
  LETTER_WINDOWS,
  type LetterKey,
} from './brandLoaderTimeline';

// Calques extraits du logo (scripts/build-logo-layers.py). Tous ont la même taille.
const LAYER_RATIO = 784 / 484;
const DIM_OPACITY = 0.15;

const LAYERS: Record<LetterKey | 'ring' | 'word' | 'wordDark', ImageSourcePropType> = {
  d: require('../../../assets/images/logo/logo-d.png'),
  s: require('../../../assets/images/logo/logo-s.png'),
  i: require('../../../assets/images/logo/logo-i.png'),
  ring: require('../../../assets/images/logo/logo-ring.png'),
  word: require('../../../assets/images/logo/logo-word.png'),
  wordDark: require('../../../assets/images/logo/logo-word-dark.png'),
};

export type BrandLoaderProps = {
  /** Largeur du logo en dp. */
  width?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Loader de marque : le logo DSI Academy dont le D, puis le S, puis le I se
 * remplissent de bas en haut, en boucle. Avec « réduire les animations », le
 * logo reste fixe et complet.
 */
export function BrandLoader({width = 200, style, testID}: BrandLoaderProps) {
  const {mode, reduceMotion} = useTheme();
  const height = Math.round(width / LAYER_RATIO);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      progress.setValue(0);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: BRAND_LOADER_CYCLE_MS,
        duration: BRAND_LOADER_CYCLE_MS,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, progress]);

  const fills = useMemo(() => {
    const result = {} as Record<LetterKey, Animated.AnimatedInterpolation<number>>;
    for (const key of LETTER_ORDER) {
      const {start, end} = LETTER_WINDOWS[key];
      result[key] = progress.interpolate({
        inputRange: [start, end],
        outputRange: [0, height],
        easing: Easing.out(Easing.cubic),
        extrapolate: 'clamp',
      });
    }
    return result;
  }, [progress, height]);

  const litOpacity = useMemo(
    () =>
      progress.interpolate({
        inputRange: [FADE_START_MS, BRAND_LOADER_CYCLE_MS],
        outputRange: [1, 0],
        extrapolate: 'clamp',
      }),
    [progress],
  );

  const layerStyle = {width, height};
  const word = mode === 'dark' ? LAYERS.wordDark : LAYERS.word;

  return (
    <View
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{width, height}, style]}>
      <Image source={LAYERS.ring} style={[styles.layer, layerStyle]} />
      <Image source={word} style={[styles.layer, layerStyle]} />
      {LETTER_ORDER.map(key => (
        <View key={key} style={[styles.layer, layerStyle]}>
          {/* Lettre éteinte */}
          <Image
            source={LAYERS[key]}
            style={[styles.layer, layerStyle, {opacity: DIM_OPACITY}]}
          />
          {/* Lettre remplie : fenêtre qui monte depuis le bas */}
          {reduceMotion ? (
            <Image source={LAYERS[key]} style={[styles.layer, layerStyle]} />
          ) : (
            <Animated.View
              testID={testID ? `${testID}-${key}` : undefined}
              style={[
                styles.window,
                {width, height: fills[key], opacity: litOpacity},
              ]}>
              <Image source={LAYERS[key]} style={[styles.windowImage, layerStyle]} />
            </Animated.View>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {position: 'absolute', top: 0, left: 0},
  window: {position: 'absolute', bottom: 0, left: 0, overflow: 'hidden'},
  windowImage: {position: 'absolute', bottom: 0, left: 0},
});
