/** Fond à dégradé horizontal orange (react-native-svg, aucune dépendance de plus). */

import React from 'react';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';
import {useSellerColors} from '@shared/designsystem';

let counter = 0;

export function SellerGradientFill() {
  const sellerColors = useSellerColors();
  // Identifiant unique : plusieurs dégradés peuvent coexister sur un écran.
  const id = React.useRef(`sg${(counter += 1)}`).current;
  return (
    <Svg
      width="100%"
      height="100%"
      style={{position: 'absolute', left: 0, top: 0, right: 0, bottom: 0}}
      pointerEvents="none">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={sellerColors.accentFrom} />
          <Stop offset="1" stopColor={sellerColors.accentTo} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}
