/**
 * Ligne du menu Plus : pastille grise avec icône, titre, description sur deux
 * lignes au plus, chevron. Les lignes se rangent dans une carte à contour.
 */

import React from 'react';
import {Pressable, View} from 'react-native';
import {Icon, Text, useSellerColors, sellerMetrics} from '@shared/designsystem';
import {SellerMenuIcon, type SellerMenuIconName} from './SellerMenuIcon';

export type SellerMenuRowProps = {
  icon: SellerMenuIconName;
  title: string;
  subtitle?: string;
  onPress: () => void;
  /** Rouge, sans chevron (Quitter). */
  danger?: boolean;
  testID?: string;
};

export function SellerMenuRow({icon, title, subtitle, onPress, danger = false, testID}: SellerMenuRowProps) {
  const sellerColors = useSellerColors();
  const ink = danger ? sellerColors.negativeText : sellerColors.ink;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      testID={testID}
      style={({pressed}) => ({
        alignItems: 'center',
        flexDirection: 'row',
        gap: 16,
        minHeight: 72,
        opacity: pressed ? 0.7 : 1,
        paddingHorizontal: sellerMetrics.cardPadding,
        paddingVertical: 14,
      })}>
      <View
        style={{
          alignItems: 'center',
          backgroundColor: danger ? sellerColors.negativeBg : sellerColors.surfaceMuted,
          borderRadius: 9999,
          height: 40,
          justifyContent: 'center',
          width: 40,
        }}>
        <SellerMenuIcon id={icon} color={ink} size={20} />
      </View>
      <View style={{flex: 1, gap: 2}}>
        <Text variant="bodyStrong" style={{color: ink}}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="bodySmall" numberOfLines={2} style={{color: sellerColors.inkMuted}}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {danger ? null : <Icon name="ChevronRightIcon" size={18} color={sellerColors.inkMuted} />}
    </Pressable>
  );
}

/** Carte à contour qui range des lignes séparées par un filet. */
export function SellerMenuCard({children, testID}: {children: React.ReactNode[]; testID?: string}) {
  const sellerColors = useSellerColors();
  const rows = React.Children.toArray(children);
  return (
    <View
      testID={testID}
      style={{
        backgroundColor: sellerColors.bg,
        borderColor: sellerColors.border,
        borderRadius: sellerMetrics.cardRadius,
        borderWidth: 1,
        overflow: 'hidden',
      }}>
      {rows.map((row, i) => (
        <View
          key={i}
          style={i > 0 ? {borderTopColor: sellerColors.border, borderTopWidth: 1} : undefined}>
          {row}
        </View>
      ))}
    </View>
  );
}
