import React from 'react';
import Svg, {Circle, Path, Rect} from 'react-native-svg';
import {useTheme} from '../theme/ThemeProvider';
import {
  ICON_STROKE_WIDTH,
  ICON_VIEWBOX,
  iconShapes,
  type IconName,
  type IconShape,
} from './iconPaths';

type IconProps = {
  name: IconName;
  /** Taille en dp (défaut 20). */
  size?: number;
  /** Couleur du trait. Par défaut : couleur du texte principal du thème. */
  color?: string;
};

/**
 * Icône décorative : cachée aux lecteurs d'écran. Le bouton ou le texte qui
 * la porte fournit le libellé d'accessibilité.
 */
export function Icon({name, size = 20, color}: IconProps) {
  const theme = useTheme();
  const stroke = color ?? theme.colors.textPrimary;
  const shapes: readonly IconShape[] = iconShapes[name];

  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${ICON_VIEWBOX} ${ICON_VIEWBOX}`}
      fill="none"
      stroke={stroke}
      strokeWidth={ICON_STROKE_WIDTH}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessible={false}
      importantForAccessibility="no-hide-descendants">
      {shapes.map((shape, index) => {
        if (shape.type === 'path') {
          return <Path key={index} d={shape.d} />;
        }
        if (shape.type === 'circle') {
          return (
            <Circle key={index} cx={shape.cx} cy={shape.cy} r={shape.r} />
          );
        }
        return (
          <Rect
            key={index}
            x={shape.x}
            y={shape.y}
            width={shape.width}
            height={shape.height}
            rx={shape.rx ?? 0}
          />
        );
      })}
    </Svg>
  );
}
