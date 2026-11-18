/**
 * Tendances Marketplace (site : MpTrendingPage). Les produits les plus achetés,
 * dans l'ordre du serveur, sans retri ; les dix premiers portent leur rang.
 */

import React, {useEffect, useSyncExternalStore} from 'react';
import {FlatList, View} from 'react-native';
import {EmptyState, ErrorState, LoadingState, Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {ProductCard} from '../components/ProductCard';
import {commerceErrorKey} from '../logic/errorKey';
import {MARKETPLACE_STORES} from '../store/marketplaceStores';
import type {CommerceProduct} from '../store/commerceTypes';

const COLUMNS = 2;
const RANKED = 10;

export type MarketplaceTrendingScreenProps = {
  onOpenProduct: (product: CommerceProduct) => void;
};

export function MarketplaceTrendingScreen({onOpenProduct}: MarketplaceTrendingScreenProps) {
  const store = MARKETPLACE_STORES.trending;
  const {t} = useTranslation();
  const {colors, spacing} = useTheme();
  const state = useSyncExternalStore(store.subscribe, store.getState);

  useEffect(() => {
    void store.load();
  }, [store]);


  let empty: React.ReactNode = null;
  if (state.items.length === 0) {
    if (state.status === 'idle' || state.status === 'loading') {
      empty = <LoadingState accessibilityLabel={t('content.loading')} />;
    } else if (state.status === 'error') {
      empty = (
        <ErrorState
          message={t(commerceErrorKey(state.errorKind))}
          retryLabel={t('common.retry')}
          onRetry={() => void store.load({force: true})}
          testID="marketplace-trending-error"
        />
      );
    } else {
      empty = (
        <EmptyState
          title={t('mp.trendingPage.emptyTitle')}
          message={t('mp.trendingPage.emptyHint')}
          testID="marketplace-trending-empty"
        />
      );
    }
  }

  return (
    <FlatList
      style={{flex: 1, backgroundColor: colors.bgApp}}
      testID="screen-marketplace-trending"
      data={state.items}
      keyExtractor={p => p.id}
      numColumns={COLUMNS}
      columnWrapperStyle={{gap: spacing.md, paddingHorizontal: spacing.xl}}
      contentContainerStyle={{gap: spacing.lg, paddingBottom: spacing.xxxl}}
      ListHeaderComponent={
        <View style={{gap: spacing.xs, padding: spacing.xl}}>
          <Text variant="title" accessibilityRole="header">
            {t('mp.trendingTitle')}
          </Text>
          <Text variant="body" color="secondary">
            {t('mp.trendingBody')}
          </Text>
        </View>
      }
      ListEmptyComponent={empty}
      renderItem={({item, index}) => (
        <ProductCard
          product={item}
          onPress={onOpenProduct}
          rank={index < RANKED ? index + 1 : undefined}
        />
      )}
    />
  );
}
