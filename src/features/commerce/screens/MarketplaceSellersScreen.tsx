/**
 * Vendeurs Marketplace (site : MpSellersPage) : les boutiques approuvées.
 * La candidature vendeur est une option décidée après L9a : aucun bouton ici.
 */

import React, {useEffect, useSyncExternalStore} from 'react';
import {FlatList, Pressable, View} from 'react-native';
import {
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Text,
  useTheme,
} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {commerceErrorKey} from '../logic/errorKey';
import {MARKETPLACE_STORES} from '../store/marketplaceStores';
import type {MarketplaceSeller} from '../store/commerceTypes';

export type MarketplaceSellersScreenProps = {
  onOpenSeller: (seller: MarketplaceSeller) => void;
};

export function MarketplaceSellersScreen({onOpenSeller}: MarketplaceSellersScreenProps) {
  const store = MARKETPLACE_STORES.sellers;
  const {t} = useTranslation();
  const {colors, spacing, touch} = useTheme();
  const state = useSyncExternalStore(store.subscribe, store.getState);

  useEffect(() => {
    void store.load();
  }, [store]);

  let empty: React.ReactNode = null;
  if (state.sellers.length === 0) {
    if (state.status === 'idle' || state.status === 'loading') {
      empty = <LoadingState accessibilityLabel={t('content.loading')} />;
    } else if (state.status === 'error') {
      empty = (
        <ErrorState
          message={t(commerceErrorKey(state.errorKind))}
          retryLabel={t('common.retry')}
          onRetry={() => void store.load({force: true})}
          testID="marketplace-sellers-error"
        />
      );
    } else {
      empty = (
        <EmptyState
          title={t('mp.sellersPage.emptyTitle')}
          message={t('mp.sellersPage.emptyHint')}
          testID="marketplace-sellers-empty"
        />
      );
    }
  }

  return (
    <FlatList
      style={{flex: 1, backgroundColor: colors.bgApp}}
      testID="screen-marketplace-sellers"
      data={state.sellers}
      keyExtractor={s => s.memberId}
      contentContainerStyle={{
        gap: spacing.md,
        paddingBottom: spacing.xxxl,
        paddingHorizontal: spacing.xl,
      }}
      ListHeaderComponent={
        <Text
          variant="title"
          accessibilityRole="header"
          style={{paddingBottom: spacing.sm, paddingTop: spacing.xl}}>
          {t('mp.sellersTitle')}
        </Text>
      }
      ListEmptyComponent={empty}
      renderItem={({item}) => (
        <Pressable
          onPress={() => onOpenSeller(item)}
          accessibilityRole="button"
          accessibilityLabel={item.storeName}
          testID={`seller-card-${item.memberId}`}
          style={{minHeight: touch.min}}>
          <Card>
            <View style={{gap: spacing.xs}}>
              <Text variant="cardTitle" numberOfLines={1}>
                {item.storeName}
              </Text>
              {item.bio ? (
                <Text variant="caption" color="secondary" numberOfLines={2}>
                  {item.bio}
                </Text>
              ) : null}
              <Text variant="micro" color="muted">
                {t('mp.sellersPage.count', {count: item.productsCount})}
                {item.rating !== null
                  ? ` · ${t('commerce.sellerRating', {value: item.rating.toFixed(1)})}`
                  : ''}
              </Text>
            </View>
          </Card>
        </Pressable>
      )}
    />
  );
}
