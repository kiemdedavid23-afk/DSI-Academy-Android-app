/**
 * Boutique d'un vendeur (site : MpSellerPage). En-tête de la boutique puis ses
 * produits. Un vendeur non approuvé répond 404 : message dédié.
 */

import React, {useEffect, useSyncExternalStore} from 'react';
import {FlatList, View} from 'react-native';
import {EmptyState, ErrorState, LoadingState, Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
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
  const {colors, spacing} = useTheme();
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
        <View style={{gap: spacing.xs, padding: spacing.xl}}>
          <Text variant="micro" color="muted" style={{textTransform: 'uppercase'}}>
            {t('mp.sellerPage.eyebrow')}
          </Text>
          <Text variant="title" accessibilityRole="header">
            {seller?.storeName ?? ''}
          </Text>
          {seller?.bio ? (
            <Text variant="body" color="secondary">
              {seller.bio}
            </Text>
          ) : null}
          {seller && seller.rating !== null ? (
            <Text variant="caption" color="secondary">
              {t('commerce.sellerRating', {value: seller.rating.toFixed(1)})}
            </Text>
          ) : null}
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
