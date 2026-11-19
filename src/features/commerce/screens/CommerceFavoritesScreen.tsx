/**
 * Favoris communs. Les produits déjà chargés dans le catalogue sont réutilisés ;
 * ceux qui manquent sont relus par le Worker (404 = favori masqué).
 */

import React, {useEffect, useState, useSyncExternalStore} from 'react';
import {FlatList, View} from 'react-native';
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  Text,
  useTheme,
} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {ProductCard} from '../components/ProductCard';
import {commerceErrorKey} from '../logic/errorKey';
import {COMMERCE_STORES} from '../store/commerceStores';
import type {CommerceProduct, CommerceSource} from '../store/commerceTypes';

const COLUMNS = 2;

export type CommerceFavoritesScreenProps = {
  source: CommerceSource;
  onOpenProduct: (product: CommerceProduct) => void;
  onDiscover: () => void;
  /** Coque : carte d'ambiance et sélecteurs, posés en tête de la liste. */
  shellHeader?: React.ReactNode;
};

export function CommerceFavoritesScreen({
  source,
  onOpenProduct,
  onDiscover,
  shellHeader,
}: CommerceFavoritesScreenProps) {
  const stores = COMMERCE_STORES[source];
  const {t} = useTranslation();
  const {colors, spacing} = useTheme();
  const [removeError, setRemoveError] = useState(false);
  const favs = useSyncExternalStore(stores.favorites.subscribe, stores.favorites.getState);

  useEffect(() => {
    void stores.favorites.load(stores.catalogue.getState().items);
  }, [stores]);

  const remove = async (product: CommerceProduct) => {
    setRemoveError(false);
    const res = await stores.favorites.toggle(product);
    if (!res.ok) {
      setRemoveError(true);
    }
  };

  if ((favs.status === 'loading' || favs.status === 'idle') && favs.items.length === 0) {
    return (
      <View style={{flex: 1, backgroundColor: colors.bgApp}}>
        {shellHeader}
        <LoadingState accessibilityLabel={t('content.loading')} />
      </View>
    );
  }
  if (favs.status === 'error' && favs.items.length === 0) {
    return (
      <View style={{flex: 1, backgroundColor: colors.bgApp}}>
        {shellHeader}
        <ErrorState
          message={t(commerceErrorKey(favs.errorKind))}
          retryLabel={t('common.retry')}
          onRetry={() => void stores.favorites.load(stores.catalogue.getState().items)}
          testID="commerce-favorites-error"
        />
      </View>
    );
  }

  return (
    <FlatList
      style={{flex: 1, backgroundColor: colors.bgApp}}
      testID={`screen-${source}-favorites`}
      data={favs.items}
      keyExtractor={p => p.id}
      numColumns={COLUMNS}
      columnWrapperStyle={{gap: spacing.md, paddingHorizontal: spacing.xl}}
      contentContainerStyle={{
        gap: spacing.lg,
        paddingBottom: spacing.xxxl,
        paddingTop: shellHeader ? 0 : spacing.lg,
      }}
      ListHeaderComponent={
        shellHeader || removeError ? (
          <View style={{gap: spacing.md}}>
            {shellHeader}
            {removeError ? (
              <Text
                variant="caption"
                color="secondary"
                style={{paddingHorizontal: spacing.xl}}
                testID="commerce-favorites-remove-error">
                {t('mp.favs.removeError')}
              </Text>
            ) : null}
          </View>
        ) : undefined
      }
      ListEmptyComponent={
        <EmptyState
          title={t('mp.favs.emptyTitle')}
          message={t('mp.favs.emptyHint')}
          actionLabel={t('mp.favs.emptyCta')}
          onAction={onDiscover}
          testID="commerce-favorites-empty"
        />
      }
      renderItem={({item}) => (
        <ProductCard
          product={item}
          onPress={onOpenProduct}
          footer={
            <Button
              variant="ghost"
              label={t('mp.favs.remove')}
              onPress={() => void remove(item)}
              testID={`favorite-remove-${item.id}`}
            />
          }
        />
      )}
    />
  );
}
