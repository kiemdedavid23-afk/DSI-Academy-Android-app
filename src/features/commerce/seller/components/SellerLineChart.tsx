/** Courbe simple en react-native-svg (D9) : aucune bibliothèque de graphiques. */

import React, {useState} from 'react';
import {View, type LayoutChangeEvent} from 'react-native';
import Svg, {Polygon, Polyline} from 'react-native-svg';
import {Text, sellerColors} from '@shared/designsystem';
import {areaAttr, chartPoints, pointsAttr} from '../logic/sellerAnalytics';

const HEIGHT = 140;

export type SellerLineChartProps = {
  values: number[];
  firstLabel: string;
  lastLabel: string;
  accessibilityLabel: string;
  testID?: string;
};

export function SellerLineChart({
  values,
  firstLabel,
  lastLabel,
  accessibilityLabel,
  testID,
}: SellerLineChartProps) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.floor(e.nativeEvent.layout.width));
  const points = chartPoints(values, width, HEIGHT);
  return (
    <View testID={testID} accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel} style={{gap: 4}}>
      <View onLayout={onLayout} style={{height: HEIGHT}}>
        {width > 0 && points.length > 0 ? (
          <Svg width={width} height={HEIGHT}>
            <Polygon points={areaAttr(points, HEIGHT)} fill={sellerColors.accentTo} fillOpacity={0.15} />
            <Polyline
              points={pointsAttr(points)}
              fill="none"
              stroke={sellerColors.accentDot}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        ) : null}
      </View>
      <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
        <Text variant="caption" style={{color: sellerColors.inkMuted}}>
          {firstLabel}
        </Text>
        <Text variant="caption" style={{color: sellerColors.inkMuted}}>
          {lastLabel}
        </Text>
      </View>
    </View>
  );
}
