/** Rangée de cinq étoiles (pleines jusqu'à `filled`), tracées en SVG. */

import React from 'react';
import {View} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import {sellerColors} from '@shared/designsystem';

const STAR = 'M12 3.5l2.6 5.3 5.9.9-4.25 4.1 1 5.8L12 16.9l-5.25 2.7 1-5.8L3.5 9.7l5.9-.9z';

export function SellerStars({filled, size = 16}: {filled: number; size?: number}) {
  return (
    <View style={{flexDirection: 'row', gap: 2}} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {[1, 2, 3, 4, 5].map(i => (
        <Svg key={i} width={size} height={size} viewBox="0 0 24 24">
          <Path
            d={STAR}
            fill={i <= filled ? sellerColors.accentDot : 'none'}
            stroke={i <= filled ? sellerColors.accentDot : sellerColors.border}
            strokeWidth={1.6}
            strokeLinejoin="round"
          />
        </Svg>
      ))}
    </View>
  );
}
