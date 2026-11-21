/** Carte d'indicateur des Analyses : icône, badge de variation, libellé, valeur, comparaison. */

import React from 'react';
import {View} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import {Text, useSellerColors, sellerMetrics} from '@shared/designsystem';

export type SellerKpiKind = 'revenue' | 'visitors' | 'views' | 'success';

const PATHS: Record<SellerKpiKind, string> = {
  revenue: 'M12 3v18M16 7.5C16 6 14.2 5 12 5s-4 1-4 2.8c0 4 8 2.4 8 6.4 0 1.8-1.8 2.8-4 2.8s-4-1-4-2.5',
  visitors: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c0-3 2.7-5 6-5s6 2 6 5M16 5.5a3 3 0 0 1 0 5.5M18 15c2 .6 3 2.2 3 5',
  views: 'M5 4l14 7-6 2-2 6z',
  success: 'M13 2L5 14h6l-1 8 8-12h-6z',
};

export type SellerKpiCardProps = {
  kind: SellerKpiKind;
  label: string;
  value: string;
  badge?: string | null;
  badgeTone?: 'positive' | 'negative' | 'neutral';
  compareText?: string;
  testID?: string;
};

export function SellerKpiCard({
  kind,
  label,
  value,
  badge,
  badgeTone = 'neutral',
  compareText,
  testID,
}: SellerKpiCardProps) {
  const sellerColors = useSellerColors();
  const ink = kind === 'revenue' ? sellerColors.positiveText : sellerColors.accent;
  const badgeBg =
    badgeTone === 'positive'
      ? sellerColors.positiveBadgeBg
      : badgeTone === 'negative'
      ? sellerColors.negativeBg
      : sellerColors.surfaceMuted;
  const badgeInk =
    badgeTone === 'positive'
      ? sellerColors.positiveBadgeText
      : badgeTone === 'negative'
      ? sellerColors.negativeText
      : sellerColors.inkMuted;
  return (
    <View
      testID={testID}
      style={{
        backgroundColor: sellerColors.bg,
        borderColor: sellerColors.border,
        borderRadius: sellerMetrics.cardRadius,
        borderWidth: 1,
        flex: 1,
        gap: 8,
        padding: sellerMetrics.cardPadding,
      }}>
      <View style={{alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between'}}>
        <View
          style={{
            alignItems: 'center',
            backgroundColor: sellerColors.surfaceMuted,
            borderRadius: 16,
            height: 44,
            justifyContent: 'center',
            width: 44,
          }}>
          <Svg width={22} height={22} viewBox="0 0 24 24" accessibilityElementsHidden>
            <Path
              d={PATHS[kind]}
              stroke={ink}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        </View>
        {badge ? (
          <View style={{backgroundColor: badgeBg, borderRadius: 9999, paddingHorizontal: 10, paddingVertical: 4}}>
            <Text variant="caption" style={{color: badgeInk}}>
              {badge}
            </Text>
          </View>
        ) : null}
      </View>
      <Text variant="bodySmall" numberOfLines={1} style={{color: sellerColors.inkMuted}}>
        {label}
      </Text>
      <Text variant="title" numberOfLines={1} adjustsFontSizeToFit style={{color: sellerColors.ink}}>
        {value}
      </Text>
      {compareText ? (
        <Text variant="caption" style={{color: sellerColors.inkMuted}}>
          {compareText}
        </Text>
      ) : null}
    </View>
  );
}
