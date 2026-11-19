/** Pictogrammes du parcours d'achat (horloge, téléphone, banque), même trait que les icônes de l'app. */

import React from 'react';
import Svg, {Circle, Path, Rect} from 'react-native-svg';

export type GlyphName = 'clock' | 'phone' | 'bank';

export function Glyph({name, size = 24, color}: {name: GlyphName; size?: number; color: string}) {
  const common = {
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none' as const,
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      {name === 'clock' ? (
        <>
          <Circle cx="12" cy="12" r="9" {...common} />
          <Path d="M12 7v5l3.5 2.2" {...common} />
        </>
      ) : null}
      {name === 'phone' ? (
        <>
          <Rect x="7" y="2.5" width="10" height="19" rx="2.2" {...common} />
          <Path d="M11 18.5h2" {...common} />
        </>
      ) : null}
      {name === 'bank' ? (
        <>
          <Path d="M12 3.5 3 8.5h18L12 3.5Z" {...common} />
          <Path d="M6 11.5v6M10 11.5v6M14 11.5v6M18 11.5v6" {...common} />
          <Path d="M3.5 20.5h17" {...common} />
        </>
      ) : null}
    </Svg>
  );
}
