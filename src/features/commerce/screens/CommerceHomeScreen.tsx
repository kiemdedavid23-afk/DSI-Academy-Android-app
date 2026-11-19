/**
 * Section Découvrir (Marketplace et Boutique), site : MpHomePage / MpTrendingPage.
 *  · Accueil : recherche, catégories, carte « À LA UNE », rails Tendances et Nouveautés ;
 *    avec une recherche ou une catégorie : les résultats en grille.
 *  · Tendances : grille classée, les dix premiers portent leur rang.
 * Ne parle qu'aux stores (R-LAY-5).
 */

import React, {useCallback, useEffect, useMemo, useState, useSyncExternalStore} from 'react';
import {ScrollView, View} from 'react-native';
import {EmptyState, ErrorState, LoadingState, Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {CommerceCategoryChips} from '../components/CommerceCategoryChips';
import {CommerceSearchField} from '../components/CommerceSearchField';
import {FeaturedProductCard} from '../components/FeaturedProductCard';
import {ProductGrid} from '../components/ProductGrid';
import {ProductRail} from '../components/ProductRail';
import {featuredOf, newestOf, RAIL_MAX, trendingOf} from '../logic/discover';
import {commerceErrorKey} from '../logic/errorKey';
import {COMMERCE_STORES} from '../store/commerceStores';
import {MARKETPLACE_STORES} from '../store/marketplaceStores';
import type {CommerceProduct, CommerceSource} from '../store/commerceTypes';

const SEARCH_DEBOUNCE_MS = 350;
const RANKED = 10;
const NO_ITEMS: CommerceProduct[] = [];

export type DiscoverTab = 'home' | 'trending';

export type CommerceHomeScreenProps = {
  source: CommerceSource;
  tab: DiscoverTab;
  shellHeader: React.ReactNode;
  onOpenProduct: (product: CommerceProduct) => void;
  onSeeAllTrending: () => void;
  onSeeAllNew: () => void;
};

export function CommerceHomeScreen({
  source,
  tab,
  shellHeader,
  onOpenProduct,
  onSeeAllTrending,
  onSeeAllNew,
}: CommerceHomeScreenProps) {
  const stores = COMMERCE_STORES[source];
  const trendingStore = MARKETPLACE_STORES.trending;
  const {t} = useTranslation();
  const {colors, spacing} = useTheme();
  const [text, setText] = useState('');

  const cat = useSyncExternalStore(stores.catalogue.subscribe, stores.catalogue.getState);
  const categories = useSyncExternalStore(stores.categories.subscribe, stores.categories.getState);
  const server = useSyncExternalStore(trendingStore.subscribe, trendingStore.getState);

  useEffect(() => {
    void stores.catalogue.load();
    void stores.categories.load();
    if (source === 'marketplace') {
      void trendingStore.load();
    }
  }, [stores, source, trendingStore]);

  // Recherche différée : un appel par pause de saisie, jamais à chaque lettre.
  useEffect(() => {
    const id = setTimeout(() => void stores.catalogue.setQuery(text), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [stores, text]);

  const open = useCallback((p: CommerceProduct) => onOpenProduct(p), [onOpenProduct]);

  const serverItems = source === 'marketplace' ? server.items : NO_ITEMS;
  const trending = useMemo(() => trendingOf(serverItems, cat.items), [serverItems, cat.items]);
  const newest = useMemo(() => newestOf(cat.items), [cat.items]);
  const featured = featuredOf(trending, cat.items);

  const filtering = cat.query.trim() !== '' || cat.category !== null;
  const loading = cat.status === 'loading' || cat.status === 'idle';

  let body: React.ReactNode;
  if (loading && cat.items.length === 0) {
    body = <LoadingState accessibilityLabel={t('content.loading')} />;
  } else if (cat.status === 'error' && cat.items.length === 0) {
    body = (
      <ErrorState
        message={t(commerceErrorKey(cat.errorKind))}
        retryLabel={t('common.retry')}
        onRetry={() => void stores.catalogue.load({force: true})}
        testID="commerce-error"
      />
    );
  } else if (tab === 'trending') {
    body =
      trending.length === 0 ? (
        <EmptyState message={t('commerce.shell.trendingEmpty')} testID="commerce-trending-empty" />
      ) : (
        <ProductGrid items={trending} onOpenProduct={open} ranked={RANKED} testID="commerce-trending" />
      );
  } else if (cat.items.length === 0) {
    body = (
      <EmptyState
        message={filtering ? t('mp.explore.emptyHint') : t('mp.home.emptyTitle')}
        testID="commerce-empty"
      />
    );
  } else if (filtering) {
    body = (
      <View style={{gap: spacing.lg}}>
        <Text variant="subtitle" style={{paddingHorizontal: spacing.xl}} accessibilityRole="header">
          {t('mp.explore.results', {count: cat.items.length})}
        </Text>
        <ProductGrid items={cat.items} onOpenProduct={open} testID="commerce-results" />
      </View>
    );
  } else {
    body = (
      <View style={{gap: spacing.xl}} testID="commerce-home">
        {featured ? <FeaturedProductCard product={featured} onPress={open} /> : null}
        <ProductRail
          title={t('commerce.shell.trendingTitle')}
          items={trending.slice(0, RAIL_MAX)}
          onOpenProduct={open}
          onSeeAll={onSeeAllTrending}
          testID="commerce-rail-trending"
        />
        <ProductRail
          title={t('commerce.shell.newTitle')}
          items={newest}
          onOpenProduct={open}
          onSeeAll={onSeeAllNew}
          testID="commerce-rail-new"
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={{flex: 1, backgroundColor: colors.bgApp}}
      contentContainerStyle={{gap: spacing.lg, paddingBottom: spacing.xxxl}}
      keyboardShouldPersistTaps="handled"
      testID={`screen-${source}-discover`}>
      {shellHeader}
      {tab === 'home' ? (
        <>
          <CommerceSearchField
            value={text}
            onChangeText={setText}
            placeholder={t('commerce.shell.searchProduct')}
            accessibilityLabel={t('app.catalogue.searchLabel')}
            testID="commerce-search"
          />
          {categories.items.length > 0 ? (
            <CommerceCategoryChips
              source={source}
              categories={categories.items}
              selected={cat.category}
              onSelect={slug => void stores.catalogue.setCategory(slug)}
            />
          ) : null}
        </>
      ) : null}
      {body}
    </ScrollView>
  );
}
