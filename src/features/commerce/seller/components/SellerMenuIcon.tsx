/** Icônes des lignes du menu Plus (tracés simples, react-native-svg). */

import React from 'react';
import Svg, {Circle, Path} from 'react-native-svg';
import type {MoreIconId} from '../logic/sellerMore';
import {SellerTabIcon} from './SellerTabIcon';

export type SellerMenuIconName = MoreIconId | 'external';

export function SellerMenuIcon({id, color, size = 22}: {id: SellerMenuIconName; color: string; size?: number}) {
  if (id === 'overview' || id === 'products' || id === 'sales' || id === 'analytics' || id === 'more') {
    return <SellerTabIcon id={id} color={color} />;
  }
  const common = {
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden>
      {id === 'reviews' ? (
        <Path {...common} d="M5 4h14a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-8l-4.5 4V16H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
      ) : null}
      {id === 'profile' ? (
        <>
          <Circle {...common} cx={12} cy={8} r={3.5} />
          <Path {...common} d="M5 19.5c0-3.6 3.1-6 7-6s7 2.4 7 6" />
        </>
      ) : null}
      {id === 'earnings' ? (
        <>
          <Path {...common} d="M4 7a2 2 0 0 1 2-2h12v3M4 7v10a2 2 0 0 0 2 2h14V8H6a2 2 0 0 1-2-1z" />
          <Circle cx={16.5} cy={13.5} r={1.2} fill={color} />
        </>
      ) : null}
      {id === 'withdrawals' ? (
        <Path {...common} d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14" />
      ) : null}
      {id === 'quit' ? (
        <Path {...common} d="M10 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M15 8l4 4-4 4M9 12h10" />
      ) : null}
      {id === 'external' ? (
        <Path {...common} d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
      ) : null}
    </Svg>
  );
}
