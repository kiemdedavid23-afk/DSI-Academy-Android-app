/**
 * Carte « À LA UNE » : fond sombre, vignette à gauche ; à droite pastille dorée,
 * titre, boutique, prix et bouton doré « Voir le produit ».
 */

import React from 'react';
import {Pressable, View} from 'react-native';
import {Icon, Text, useTheme, withAlpha} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {formatDsiAmount} from '../logic/format';
import type {CommerceProduct} from '../store/commerceTypes';
import {ProductCover} from './ProductCover';

const THUMB = 112;

export type FeaturedProductCardProps = {
  product: CommerceProduct;
  onPress: (product: CommerceProduct) => void;
};

export function FeaturedProductCard({product, onPress}: FeaturedProductCardProps) {
  const {t} = useTranslation();
  const {colors, spacing, radii, touch} = useTheme();
  const subtitle = product.storeName ?? product.tagline;

  return (
    <View
      testID="commerce-featured"
      style={{
        backgroundColor: colors.bgDarkPremium,
        borderColor: colors.goldBorder,
        borderRadius: radii.lg,
        borderWidth: 1,
        flexDirection: 'row',
        gap: spacing.lg,
        marginHorizontal: spacing.xl,
        padding: spacing.lg,
      }}>
      <View style={{width: THUMB}}>
        <ProductCover coverUrl={product.coverUrl} title={product.title} />
      </View>
      <View style={{flex: 1, gap: spacing.xs}}>
        <View
          style={{
            alignSelf: 'flex-start',
            backgroundColor: withAlpha(colors.goldPrestige, 0.14),
            borderColor: colors.goldBorder,
            borderRadius: radii.sm,
            borderWidth: 1,
            paddingHorizontal: spacing.md,
            paddingVertical: 2,
          }}>
          <Text variant="micro" color="gold" style={{letterSpacing: 0.8, textTransform: 'uppercase'}}>
            {t('commerce.shell.featured')}
          </Text>
        </View>
        <Text variant="subtitle" color="onDark" numberOfLines={3}>
          {product.title}
        </Text>
        {subtitle ? (
          <Text variant="bodySmall" color="onDark" numberOfLines={1} style={{opacity: 0.85}}>
            {subtitle}
          </Text>
        ) : null}
        <Text variant="bodyStrong" color="onDark">
          {product.free ? t('mp.card.free') : `${formatDsiAmount(product.priceDsi)} `}
          {product.free ? null : (
            <Text variant="micro" color="onDark" style={{opacity: 0.8}}>
              {t('mp.card.currency')}
            </Text>
          )}
        </Text>
        <Pressable
          onPress={() => onPress(product)}
          accessibilityRole="button"
          accessibilityLabel={t('commerce.openProduct', {title: product.title})}
          testID="commerce-featured-open"
          style={{
            alignItems: 'center',
            backgroundColor: colors.goldPrestige,
            borderRadius: radii.md,
            flexDirection: 'row',
            gap: spacing.sm,
            justifyContent: 'space-between',
            marginTop: spacing.xs,
            minHeight: touch.min,
            paddingHorizontal: spacing.lg,
          }}>
          <Text variant="button" style={{color: colors.bgDarkPremium, flexShrink: 1}}>
            {t('commerce.shell.viewProduct')}
          </Text>
          <Icon name="ArrowRightIcon" size={18} color={colors.bgDarkPremium} />
        </Pressable>
      </View>
    </View>
  );
}
