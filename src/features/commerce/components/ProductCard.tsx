/**
 * Carte produit commune (site : ProductCard Marketplace). Visuel 4:5 avec rang
 * (pastille or, en haut à gauche) et catégorie (pastille sombre, en bas à
 * gauche), puis texte dessous : titre, vendeur, prix et note. `footer`
 * accueille une action propre à l'écran.
 */

import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {categoryKeys} from '../logic/errorKey';
import type {CommerceProduct} from '../store/commerceTypes';
import {PriceTag} from './PriceTag';
import {ProductCover} from './ProductCover';
import {StarMark} from './Stars';

export type ProductCardProps = {
  product: CommerceProduct;
  onPress: (product: CommerceProduct) => void;
  footer?: React.ReactNode;
  /** Rang dans les tendances (1 à 10) : pastille or. */
  rank?: number;
};

export function ProductCard({product, onPress, footer, rank}: ProductCardProps) {
  const {t} = useTranslation();
  const {spacing, colors, radii, touch} = useTheme();
  const subtitle = product.storeName ?? product.tagline;
  const pill = rank ? String(rank) : product.badge;
  const category = product.category
    ? t(categoryKeys(product.source, product.category), {
        defaultValue: product.category.charAt(0).toUpperCase() + product.category.slice(1),
      })
    : null;
  const rating =
    product.reviewAvg !== null && product.reviewCount > 0 ? product.reviewAvg : null;

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => onPress(product)}
        accessibilityRole="button"
        accessibilityLabel={t('commerce.openProduct', {title: product.title})}
        testID={`product-card-${product.id}`}
        style={({pressed}) => [styles.card, {minHeight: touch.min, opacity: pressed ? 0.85 : 1}]}>
        <ProductCover source={product.source} coverUrl={product.coverUrl} title={product.title}>
          {pill ? (
            <View
              accessibilityLabel={rank ? t('mp.card.rank', {rank}) : undefined}
              style={[
                styles.badge,
                {backgroundColor: colors.goldPrestige, borderRadius: radii.pill, left: spacing.sm, top: spacing.sm},
              ]}>
              <Text variant="captionStrong" style={{color: colors.bgDarkPremium}}>
                {pill}
              </Text>
            </View>
          ) : null}
          {category ? (
            <View
              style={[
                styles.chip,
                {borderRadius: radii.pill, bottom: spacing.sm, left: spacing.sm, maxWidth: '88%'},
              ]}>
              <Text variant="micro" numberOfLines={1} style={{color: '#FFFFFF'}}>
                {category}
              </Text>
            </View>
          ) : null}
        </ProductCover>
        <View style={{gap: 3, paddingTop: spacing.sm}}>
          <Text variant="cardTitle" numberOfLines={2}>
            {product.title}
          </Text>
          {subtitle ? (
            <Text variant="caption" color="secondary" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
          <View style={styles.foot}>
            <PriceTag priceDsi={product.priceDsi} free={product.free} />
            {rating !== null ? (
              <View
                style={styles.rating}
                accessibilityLabel={t('mp.card.rating', {value: rating.toFixed(1)})}>
                <StarMark size={13} />
                <Text variant="captionStrong" color="secondary">
                  {rating.toFixed(1)}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {flex: 1},
  card: {flex: 1},
  badge: {
    alignItems: 'center',
    height: 26,
    justifyContent: 'center',
    minWidth: 26,
    paddingHorizontal: 7,
    position: 'absolute',
  },
  chip: {
    backgroundColor: 'rgba(2, 8, 23, 0.72)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    position: 'absolute',
  },
  foot: {alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'space-between'},
  rating: {alignItems: 'center', flexDirection: 'row', gap: 4},
});
