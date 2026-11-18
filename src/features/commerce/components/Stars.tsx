/** Étoile or du site (StarMark) et rangée de 5 étoiles pour une note. */

import React from 'react';
import {View} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import {useTheme} from '@shared/designsystem';

const STAR =
  'M12 3.2l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.2l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3.2z';

export function StarMark({size = 14, filled = true}: {size?: number; filled?: boolean}) {
  const {colors} = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Path
        d={STAR}
        fill={filled ? colors.goldPrestige : 'none'}
        stroke={filled ? 'none' : colors.textMuted}
        strokeWidth={1.4}
      />
    </Svg>
  );
}

export function RatingStars({value, size = 14}: {value: number; size?: number}) {
  const full = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <View style={{flexDirection: 'row', gap: 2}} accessible={false}>
      {[1, 2, 3, 4, 5].map(n => (
        <StarMark key={n} size={size} filled={n <= full} />
      ))}
    </View>
  );
}
