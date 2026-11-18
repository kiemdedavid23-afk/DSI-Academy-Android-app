/**
 * Accueil Marketplace (site : MpHomePage) : produit à la une, rangée Tendances,
 * rangée Nouveautés. Affiché au-dessus du catalogue quand aucun filtre n'est actif.
 */

import React, {useEffect, useMemo, useSyncExternalStore} from 'react';
import {Pressable, View} from 'react-native';
import {Text, useTheme, withAlpha} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {MARKETPLACE_STORES} from '../store/marketplaceStores';
import type {CommerceProduct} from '../store/commerceTypes';
import {PriceTag} from './PriceTag';
import {ProductCover} from './ProductCover';
import {ProductRail} from './ProductRail';

const RAIL_MAX = 10;

export type MarketplaceHomeSectionsProps = {
  catalogue: CommerceProduct[];
  onOpenProduct: (product: CommerceProduct) => void;
  onOpenTrending?: () => void;
};

export function MarketplaceHomeSections({
  catalogue,
  onOpenProduct,
  onOpenTrending,
}: MarketplaceHomeSectionsProps) {
  const store = MARKETPLACE_STORES.trending;
  const {t} = useTranslation();
  const {colors, spacing, radii} = useTheme();
  const trending = useSyncExternalStore(store.subscribe, store.getState);

  useEffect(() => {
    void store.load();
  }, [store]);

  const newest = useMemo(
    () =>
      [...catalogue]
        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
        .slice(0, RAIL_MAX),
    [catalogue],
  );
  const featured = trending.items[0] ?? catalogue[0] ?? null;

  return (
    <View style={{gap: spacing.xl}} testID="marketplace-home-sections">
      {featured ? (
        <Pressable
          onPress={() => onOpenProduct(featured)}
          accessibilityRole="button"
          accessibilityLabel={t('commerce.openProduct', {title: featured.title})}
          testID="marketplace-featured"
          style={{marginHorizontal: spacing.xl}}>
          <ProductCover
            source="marketplace"
            coverUrl={featured.coverUrl}
            title={featured.title}
            aspect={16 / 10}
            style={{borderRadius: radii.lg, borderColor: colors.goldBorder}}>
            <View
              style={{
                backgroundColor: withAlpha(colors.bgDarkPremium, 0.72),
                bottom: 0,
                gap: 4,
                left: 0,
                padding: spacing.lg,
                position: 'absolute',
                right: 0,
              }}>
              <Text variant="micro" style={{color: colors.goldPrestige, textTransform: 'uppercase'}}>
                {t('mp.home.featuredEyebrow')}
              </Text>
              <Text variant="subtitle" numberOfLines={2} style={{color: colors.textOnDark}}>
                {featured.title}
              </Text>
              {featured.storeName ? (
                <Text variant="caption" numberOfLines={1} style={{color: colors.textOnDark, opacity: 0.9}}>
                  {featured.storeName}
                </Text>
              ) : null}
            </View>
          </ProductCover>
          <View style={{paddingTop: spacing.sm}}>
            <PriceTag priceDsi={featured.priceDsi} free={featured.free} />
          </View>
        </Pressable>
      ) : null}
      <ProductRail
        title={t('mp.trending')}
        items={trending.items.slice(0, RAIL_MAX)}
        onOpenProduct={onOpenProduct}
        onSeeAll={onOpenTrending}
        testID="marketplace-rail-trending"
      />
      <ProductRail
        title={t('mp.home.newTitle')}
        items={newest}
        onOpenProduct={onOpenProduct}
        testID="marketplace-rail-new"
      />
      <Text
        variant="subtitle"
        accessibilityRole="header"
        style={{paddingHorizontal: spacing.xl}}>
        {t('mp.home.catalogTitle')}
      </Text>
    </View>
  );
}
