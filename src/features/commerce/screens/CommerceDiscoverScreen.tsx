/**
 * Catalogue commun Boutique + Marketplace : titre, recherche, catégories,
 * grille de produits. Même écran pour les deux sources (décision D2) ; seul
 * le jeu de stores change. Source site : MpHomePage / MpExplorePage.
 * Ne parle qu'aux stores (R-LAY-5).
 */

import React, {useCallback, useEffect, useState, useSyncExternalStore} from 'react';
import {FlatList, View} from 'react-native';
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  Text,
  TextField,
  useTheme,
} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {MarketplaceHomeSections} from '../components/MarketplaceHomeSections';
import {CommerceCategoryChips} from '../components/CommerceCategoryChips';
import {ProductCard} from '../components/ProductCard';
import {commerceErrorKey} from '../logic/errorKey';
import {COMMERCE_STORES} from '../store/commerceStores';
import type {CommerceProduct, CommerceSource} from '../store/commerceTypes';

const SEARCH_DEBOUNCE_MS = 350;
const COLUMNS = 2;

export type CommerceDiscoverScreenProps = {
  source: CommerceSource;
  onOpenProduct: (product: CommerceProduct) => void;
  /** Marketplace seulement (L9a) : entrées vers tendances et vendeurs. */
  onOpenTrending?: () => void;
  onOpenSellers?: () => void;
};

export function CommerceDiscoverScreen({
  source,
  onOpenProduct,
  onOpenTrending,
  onOpenSellers,
}: CommerceDiscoverScreenProps) {
  const stores = COMMERCE_STORES[source];
  const {t} = useTranslation();
  const {colors, spacing} = useTheme();
  const [text, setText] = useState('');

  const cat = useSyncExternalStore(stores.catalogue.subscribe, stores.catalogue.getState);
  const categories = useSyncExternalStore(
    stores.categories.subscribe,
    stores.categories.getState,
  );

  useEffect(() => {
    void stores.catalogue.load();
    void stores.categories.load();
  }, [stores]);

  // Recherche différée : un appel par pause de saisie, jamais à chaque lettre.
  useEffect(() => {
    const id = setTimeout(() => void stores.catalogue.setQuery(text), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [stores, text]);

  const open = useCallback(
    (product: CommerceProduct) => onOpenProduct(product),
    [onOpenProduct],
  );

  const title = t(source === 'shop' ? 'shop.heroTitle' : 'mp.homeTitle');
  const body = t(source === 'shop' ? 'shop.heroBody' : 'mp.homeBody');
  const filtering = cat.query.trim() !== '' || cat.category !== null;
  const loading = cat.status === 'loading' || cat.status === 'idle';

  const header = (
    <View style={{gap: spacing.md, paddingBottom: spacing.md}}>
      <View style={{gap: spacing.xs, paddingHorizontal: spacing.xl, paddingTop: spacing.lg}}>
        <Text variant="title" accessibilityRole="header">
          {title}
        </Text>
        <Text variant="body" color="secondary">
          {body}
        </Text>
      </View>
      <View style={{paddingHorizontal: spacing.xl}}>
        <TextField
          label={t('app.catalogue.searchLabel')}
          value={text}
          onChangeText={setText}
          placeholder={t(
            source === 'shop' ? 'shop.searchPlaceholder' : 'mp.home.searchPlaceholder',
          )}
          testID="commerce-search"
        />
      </View>
      {source === 'marketplace' && (onOpenTrending || onOpenSellers) ? (
        <View style={{flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.xl}}>
          {onOpenTrending ? (
            <View style={{flex: 1}}>
              <Button
                variant="secondary"
                label={t('mp.trending')}
                accessibilityLabel={t('commerce.discover.trending')}
                onPress={onOpenTrending}
                testID="marketplace-open-trending"
              />
            </View>
          ) : null}
          {onOpenSellers ? (
            <View style={{flex: 1}}>
              <Button
                variant="secondary"
                label={t('mp.sellers')}
                accessibilityLabel={t('commerce.discover.sellers')}
                onPress={onOpenSellers}
                testID="marketplace-open-sellers"
              />
            </View>
          ) : null}
        </View>
      ) : null}
      {categories.items.length > 0 ? (
        <CommerceCategoryChips
          source={source}
          categories={categories.items}
          selected={cat.category}
          onSelect={slug => void stores.catalogue.setCategory(slug)}
        />
      ) : null}
      {source === 'marketplace' && !filtering && cat.status === 'success' && cat.items.length > 0 ? (
        <MarketplaceHomeSections
          catalogue={cat.items}
          onOpenProduct={open}
          onOpenTrending={onOpenTrending}
        />
      ) : null}
      {filtering && cat.status === 'success' && cat.items.length > 0 ? (
        <Text
          variant="subtitle"
          style={{paddingHorizontal: spacing.xl}}
          accessibilityRole="header">
          {t('mp.explore.results', {count: cat.items.length})}
        </Text>
      ) : null}
    </View>
  );

  let empty: React.ReactNode = null;
  if (loading && cat.items.length === 0) {
    empty = <LoadingState accessibilityLabel={t('content.loading')} />;
  } else if (cat.status === 'error' && cat.items.length === 0) {
    empty = (
      <ErrorState
        message={t(commerceErrorKey(cat.errorKind))}
        retryLabel={t('common.retry')}
        onRetry={() => void stores.catalogue.load({force: true})}
        testID="commerce-error"
      />
    );
  } else if (cat.items.length === 0) {
    empty = (
      <EmptyState
        message={filtering ? t('mp.explore.emptyHint') : t('mp.home.emptyTitle')}
        testID="commerce-empty"
      />
    );
  }

  return (
    <FlatList
      style={{flex: 1, backgroundColor: colors.bgApp}}
      testID={`screen-${source}-discover`}
      data={cat.items}
      keyExtractor={p => p.id}
      numColumns={COLUMNS}
      columnWrapperStyle={{gap: spacing.md, paddingHorizontal: spacing.xl}}
      contentContainerStyle={{gap: spacing.lg, paddingBottom: spacing.xxxl}}
      ListHeaderComponent={header}
      ListEmptyComponent={empty ?? undefined}
      keyboardShouldPersistTaps="handled"
      renderItem={({item}) => <ProductCard product={item} onPress={open} />}
    />
  );
}
