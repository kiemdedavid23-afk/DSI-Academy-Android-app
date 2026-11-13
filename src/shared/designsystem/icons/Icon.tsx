// src/shared/designsystem/icons/Icon.tsx
import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { iconPaths } from './iconPaths';

type Props = {
  name: keyof typeof iconPaths;
  size?: number;
  color?: string;
};

export function Icon({ name, size = 24, color = 'currentColor' }: Props) {
  const d = iconPaths[name];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <Path d={d} />
    </Svg>
  );
}