/**
 * Sous la description d'une fiche Marketplace (site : MpProductPage) : carte du
 * vendeur, avis des membres, puis « Du même vendeur ». Branché dans
 * `renderAction` : la fiche commune n'en connaît pas la logique.
 */

import React, {useEffect, useSyncExternalStore} from 'react';
import {Pressable, View} from 'react-native';
import {Icon, Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {MARKETPLACE_STORES} from '../store/marketplaceStores';
import type {CommerceProduct} from '../store/commerceTypes';
import {MarketplaceReviews} from './MarketplaceReviews';
import {ProductCover} from './ProductCover';
import {ProductRail} from './ProductRail';

export type MarketplaceProductExtrasProps = {
  product: CommerceProduct;
  onOpenSeller: (memberId: string) => void;
  onOpenProduct: (product: CommerceProduct) => void;
};

export function MarketplaceProductExtras({
  product,
  onOpenSeller,
  onOpenProduct,
}: MarketplaceProductExtrasProps) {
  const store = MARKETPLACE_STORES.seller;
  const {t} = useTranslation();
  const {colors, spacing, radii, glass, touch} = useTheme();
  const seller = useSyncExternalStore(store.subscribe, store.getState);
  const sellerId = product.sellerId;

  useEffect(() => {
    if (sellerId) {
      void store.open(sellerId, null);
    }
  }, [store, sellerId]);

  const related =
    sellerId && seller.id === sellerId
      ? seller.products.filter(p => p.id !== product.id).slice(0, 8)
      : [];
  const storeName = product.storeName ?? t('mp.pd.sellerFallback');

  return (
    <View style={{gap: spacing.xl}} testID="marketplace-product-extras">
      {sellerId ? (
        <View style={{gap: spacing.sm}}>
          <Text variant="subtitle" accessibilityRole="header">
            {t('mp.pd.storeTitle')}
          </Text>
          <Pressable
            onPress={() => onOpenSeller(sellerId)}
            accessibilityRole="button"
            accessibilityLabel={`${t('mp.pd.storeVisit')} ${storeName}`}
            testID="marketplace-visit-seller"
            style={{
              alignItems: 'center',
              backgroundColor: glass.bg,
              borderColor: glass.border,
              borderRadius: radii.lg,
              borderWidth: 1,
              flexDirection: 'row',
              gap: spacing.md,
              minHeight: touch.min,
              padding: spacing.md,
            }}>
            <View style={{width: 52}}>
              <ProductCover
                coverUrl={null}
                title={storeName}
                aspect={1}
                initialVariant="cardTitle"
              />
            </View>
            <View style={{flex: 1, gap: 2}}>
              <Text variant="cardTitle" numberOfLines={1}>
                {storeName}
              </Text>
              <Text variant="caption" color="secondary">
                {t('mp.pd.storeVisit')}
              </Text>
            </View>
            <Icon name="ChevronRightIcon" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>
      ) : null}

      <MarketplaceReviews productId={product.id} />

      {related.length > 0 ? (
        <View style={{marginHorizontal: -spacing.xl}}>
          <ProductRail
            title={t('mp.pd.moreFromStore')}
            items={related}
            onOpenProduct={onOpenProduct}
            testID="marketplace-rail-seller"
          />
        </View>
      ) : null}
    </View>
  );
}
