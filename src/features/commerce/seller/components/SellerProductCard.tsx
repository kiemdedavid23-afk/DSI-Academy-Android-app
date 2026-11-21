/** Carte produit de la liste (capture Produits) : couverture colorée, menu ⋮, badge et prix. */

import React from 'react';
import {Image, Pressable, View} from 'react-native';
import {Text, sellerColors} from '@shared/designsystem';

export type SellerProductCardProps = {
  title: string;
  categoryLabel: string;
  coverUrl: string | null;
  /** Alterne pêche / ciel d'une carte à l'autre. */
  tone: 'peach' | 'sky';
  statusLabel: string;
  statusTone: 'positive' | 'neutral' | 'negative';
  priceLabel: string;
  menuLabel: string;
  busy?: boolean;
  onPress: () => void;
  onMenu: () => void;
  testID?: string;
};

export function SellerProductCard({
  title,
  categoryLabel,
  coverUrl,
  tone,
  statusLabel,
  statusTone,
  priceLabel,
  menuLabel,
  busy = false,
  onPress,
  onMenu,
  testID,
}: SellerProductCardProps) {
  const badgeBg =
    statusTone === 'positive'
      ? sellerColors.positiveBadgeBg
      : statusTone === 'negative'
      ? sellerColors.negativeBg
      : sellerColors.surfaceMuted;
  const badgeInk =
    statusTone === 'positive'
      ? sellerColors.positiveText
      : statusTone === 'negative'
      ? sellerColors.negativeText
      : sellerColors.inkMuted;
  return (
    <View testID={testID} style={{flex: 1, gap: 8, opacity: busy ? 0.5 : 1}}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={title}
        style={{
          aspectRatio: 1,
          backgroundColor: tone === 'peach' ? sellerColors.coverPeach : sellerColors.coverSky,
          borderRadius: 24,
          overflow: 'hidden',
          padding: 16,
        }}>
        {coverUrl ? (
          <Image
            source={{uri: coverUrl}}
            resizeMode="cover"
            style={{height: '100%', position: 'absolute', width: '100%'}}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <>
            <View
              style={{
                backgroundColor: sellerColors.accentDot,
                borderRadius: 9999,
                bottom: -40,
                height: 110,
                position: 'absolute',
                right: -30,
                width: 110,
              }}
            />
            <Text variant="caption" style={{color: sellerColors.inkMuted, textTransform: 'uppercase'}}>
              {categoryLabel}
            </Text>
            <Text variant="title" numberOfLines={3} style={{color: sellerColors.ink}}>
              {title}
            </Text>
          </>
        )}
      </Pressable>
      <Pressable
        onPress={onMenu}
        accessibilityRole="button"
        accessibilityLabel={menuLabel}
        hitSlop={4}
        style={{
          alignItems: 'center',
          backgroundColor: sellerColors.bg,
          borderRadius: 9999,
          height: 44,
          justifyContent: 'center',
          position: 'absolute',
          right: 8,
          top: 8,
          width: 44,
        }}>
        <Text variant="title" style={{color: sellerColors.ink}}>
          ⋮
        </Text>
      </Pressable>
      <Text variant="bodyStrong" numberOfLines={2} style={{color: sellerColors.ink}}>
        {title}
      </Text>
      <View style={{alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
        <View style={{backgroundColor: badgeBg, borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 4}}>
          <Text variant="caption" style={{color: badgeInk}}>
            {statusLabel}
          </Text>
        </View>
        <Text variant="bodySmall" style={{color: sellerColors.inkMuted}}>
          {priceLabel}
        </Text>
      </View>
    </View>
  );
}
