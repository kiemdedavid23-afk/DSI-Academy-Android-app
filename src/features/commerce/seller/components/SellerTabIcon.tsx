/** Icônes de la barre d'onglets vendeur (tracés simples, react-native-svg). */

import React from 'react';
import Svg, {Circle, Path} from 'react-native-svg';

export type SellerTabId = 'overview' | 'products' | 'sales' | 'analytics' | 'more';

export function SellerTabIcon({id, color}: {id: SellerTabId; color: string}) {
  const common = {
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" accessibilityElementsHidden>
      {id === 'overview' ? (
        <Path {...common} d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />
      ) : null}
      {id === 'products' ? (
        <Path {...common} d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zM12 12l8-4.5M12 12v9M12 12L4 7.5" />
      ) : null}
      {id === 'sales' ? (
        <Path {...common} d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6" />
      ) : null}
      {id === 'analytics' ? <Path {...common} d="M5 20V10M12 20V4M19 20v-7" /> : null}
      {id === 'more' ? (
        <>
          <Circle cx={5} cy={12} r={1.6} fill={color} />
          <Circle cx={12} cy={12} r={1.6} fill={color} />
          <Circle cx={19} cy={12} r={1.6} fill={color} />
        </>
      ) : null}
    </Svg>
  );
}
