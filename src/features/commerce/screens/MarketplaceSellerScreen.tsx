/**
 * Boutique d'un vendeur (site : MpSellerPage). En-tête de la boutique puis ses
 * produits. Un vendeur non approuvé répond 404 : message dédié.
 */

import React, {useEffect, useSyncExternalStore} from 'react';
import {FlatList, Image, View} from 'react-native';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  Text,
  useTheme,
  withAlpha,
} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {ProductCover} from '../components/ProductCover';
import {artFor} from '../logic/art';
import {ProductCard} from '../components/ProductCard';
import {commerceErrorKey} from '../logic/errorKey';
import {MARKETPLACE_STORES} from '../store/marketplaceStores';
import type {CommerceProduct, MarketplaceSeller} from '../store/commerceTypes';

const COLUMNS = 2;

export type MarketplaceSellerScreenProps = {
  memberId: string;
  /** Vendeur déjà connu (liste) : affiché sans attendre le Worker. */
  seed?: MarketplaceSeller | null;
  onOpenProduct: (product: CommerceProduct) => void;
};

export function MarketplaceSellerScreen({
  memberId,
  seed,
  onOpenProduct,
}: MarketplaceSellerScreenProps) {
  const store = MARKETPLACE_STORES.seller;
  const {t} = useTranslation();
  const {colors, spacing, radii} = useTheme();
  const state = useSyncExternalStore(store.subscribe, store.getState);

  useEffect(() => {
    void store.open(memberId, seed ?? null);
    // `seed` n'est lu qu'à l'ouverture.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, memberId]);

  const mine = state.id === memberId;
  const seller = mine ? state.seller : null;
  const status = mine ? state.status : 'loading';

  if (mine && status === 'error') {
    const missing = state.errorKind === 'notFound';
    return (
      <View style={{flex: 1, backgroundColor: colors.bgApp}}>
        {missing ? (
          <EmptyState
            title={t('mp.sellerPage.emptyTitle')}
            message={t('mp.sellerPage.notFoundHint')}
            testID="marketplace-seller-notfound"
          />
        ) : (
          <ErrorState
            message={t(commerceErrorKey(state.errorKind))}
            retryLabel={t('common.retry')}
            onRetry={() => void store.open(memberId, null)}
            testID="marketplace-seller-error"
          />
        )}
      </View>
    );
  }

  const products = mine ? state.products : [];

  return (
    <FlatList
      style={{flex: 1, backgroundColor: colors.bgApp}}
      testID="screen-marketplace-seller"
      data={products}
      keyExtractor={p => p.id}
      numColumns={COLUMNS}
      columnWrapperStyle={{gap: spacing.md, paddingHorizontal: spacing.xl}}
      contentContainerStyle={{gap: spacing.lg, paddingBottom: spacing.xxxl}}
      ListHeaderComponent={
        <View style={{gap: spacing.lg, padding: spacing.xl}}>
          <View
            style={{
              backgroundColor: colors.bgDarkPremium,
              borderColor: colors.goldBorder,
              borderRadius: radii.lg,
              borderWidth: 1,
              overflow: 'hidden',
            }}>
            <Image
              source={artFor(seller?.storeName)}
              blurRadius={20}
              resizeMode="cover"
              style={{position: 'absolute', top: 0, bottom: 0, left: 0, right: 0}}
              accessible={false}
            />
            <View
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: withAlpha(colors.bgDarkPremium, 0.6),
              }}
            />
            <View
              style={{alignItems: 'center', flexDirection: 'row', gap: spacing.lg, padding: spacing.xl}}>
              <View style={{width: 88}}>
                <ProductCover
                  coverUrl={null}
                  title={seller?.storeName}
                  aspect={1}
                  initialVariant="display"
                  style={{borderRadius: radii.lg}}
                />
              </View>
              <View style={{alignItems: 'flex-start', flex: 1, gap: 6}}>
                <View
                  style={{
                    backgroundColor: withAlpha(colors.goldPrestige, 0.14),
                    borderColor: colors.goldBorder,
                    borderRadius: radii.pill,
                    borderWidth: 1,
                    paddingHorizontal: 9,
                    paddingVertical: 3,
                  }}>
                  <Text variant="micro" style={{color: colors.goldPrestige, textTransform: 'uppercase'}}>
                    {t('mp.sellerPage.eyebrow')}
                  </Text>
                </View>
                <Text variant="title" accessibilityRole="header" style={{color: colors.textOnDark}}>
                  {seller?.storeName ?? ''}
                </Text>
                {seller?.bio ? (
                  <Text variant="bodySmall" numberOfLines={3} style={{color: colors.textOnDark, opacity: 0.88}}>
                    {seller.bio}
                  </Text>
                ) : null}
                {seller && seller.rating !== null ? (
                  <Text variant="caption" style={{color: colors.textOnDark, opacity: 0.88}}>
                    {t('commerce.sellerRating', {value: seller.rating.toFixed(1)})}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
          {status === 'success' ? (
            <Text variant="subtitle" accessibilityRole="header">
              {t('mp.sellerProducts')}
            </Text>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        status === 'loading' ? (
          <LoadingState accessibilityLabel={t('content.loading')} />
        ) : (
          <EmptyState
            title={t('mp.sellerPage.emptyTitle')}
            message={t('mp.sellerPage.emptyHint')}
            testID="marketplace-seller-empty"
          />
        )
      }
      renderItem={({item}) => <ProductCard product={item} onPress={onOpenProduct} />}
    />
  );
}
