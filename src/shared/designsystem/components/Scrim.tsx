import React, {useId} from 'react';
import {StyleSheet} from 'react-native';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';
import {useTheme} from '../theme/ThemeProvider';

export type ScrimProps = {
  /** Opacité en haut (0 à 1). */
  from?: number;
  /** Opacité en bas (0 à 1). */
  to?: number;
};

/**
 * Dégradé sombre posé sur une image (site : linear-gradient(180deg, …) des
 * héros et cartes). Remplit le parent, ne capte aucun appui.
 */
export function Scrim({from = 0.15, to = 0.9}: ScrimProps) {
  const {colors} = useTheme();
  const id = `scrim${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg
      style={StyleSheet.absoluteFill}
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      pointerEvents="none">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.bgDarkPremium} stopOpacity={from} />
          <Stop offset="1" stopColor={colors.bgDarkPremium} stopOpacity={to} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}
