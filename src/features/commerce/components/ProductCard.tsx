/**
 * Carte produit commune (site : ProductCard Marketplace). Même carte pour la
 * Boutique et la Marketplace : couverture 4:3, pastille or (badge), titre,
 * vendeur ou accroche, prix. `footer` accueille une action propre à l'écran.
 */

import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import type {CommerceProduct} from '../store/commerceTypes';
import {PriceTag} from './PriceTag';
import {ProductCover} from './ProductCover';

export type ProductCardProps = {
  product: CommerceProduct;
  onPress: (product: CommerceProduct) => void;
  footer?: React.ReactNode;
};

export function ProductCard({product, onPress, footer}: ProductCardProps) {
  const {t} = useTranslation();
  const {spacing, colors, radii, touch} = useTheme();
  const subtitle = product.storeName ?? product.tagline;

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => onPress(product)}
        accessibilityRole="button"
        accessibilityLabel={t('commerce.openProduct', {title: product.title})}
        testID={`product-card-${product.id}`}
        style={({pressed}) => [
          styles.card,
          {minHeight: touch.min, opacity: pressed ? 0.85 : 1},
        ]}>
        <ProductCover source={product.source} coverUrl={product.coverUrl}>
          {product.badge ? (
            <View
              style={[
                styles.pill,
                {
                  backgroundColor: colors.goldPrestige,
                  borderRadius: radii.pill,
                  left: spacing.sm,
                  paddingHorizontal: spacing.sm,
                  top: spacing.sm,
                },
              ]}>
              <Text variant="micro" style={{color: colors.bgDarkPremium}}>
                {product.badge}
              </Text>
            </View>
          ) : null}
        </ProductCover>
        <View style={{gap: spacing.xs, paddingTop: spacing.sm}}>
          <Text variant="cardTitle" numberOfLines={2}>
            {product.title}
          </Text>
          {subtitle ? (
            <Text variant="caption" color="secondary" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
          <PriceTag priceDsi={product.priceDsi} free={product.free} />
        </View>
      </Pressable>
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {flex: 1},
  card: {flex: 1},
  pill: {alignItems: 'center', justifyContent: 'center', position: 'absolute'},
});
