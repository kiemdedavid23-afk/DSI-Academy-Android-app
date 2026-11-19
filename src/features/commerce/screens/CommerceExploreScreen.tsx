/**
 * Section Explorer (Marketplace et Boutique), site : MpExplorePage.
 *  · Recherche : champ, catégories, « N résultats — Trier par », grille.
 *  · Catégories : la liste ; un choix ouvre Recherche filtrée.
 *  · Vendeurs (Marketplace seulement) : les boutiques approuvées.
 * Le tri se fait côté app. Ne parle qu'aux stores (R-LAY-5).
 */

import React, {useCallback, useEffect, useMemo, useState, useSyncExternalStore} from 'react';
import {Pressable, ScrollView, View} from 'react-native';
import {
  Button,
  EmptyState,
  ErrorState,
  Icon,
  LoadingState,
  Text,
  useTheme,
} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {CommerceCategoryChips} from '../components/CommerceCategoryChips';
import {CommerceSearchField} from '../components/CommerceSearchField';
import {CommerceUnderTabs} from '../components/CommerceUnderTabs';
import {ProductCover} from '../components/ProductCover';
import {ProductGrid} from '../components/ProductGrid';
import {SortMenu} from '../components/SortMenu';
import {DEFAULT_SORT, exploreTabsFor, sortProducts, type ExploreTab, type SortKey} from '../logic/explore';
import {categoryKeys, commerceErrorKey} from '../logic/errorKey';
import {COMMERCE_STORES} from '../store/commerceStores';
import {MARKETPLACE_STORES} from '../store/marketplaceStores';
import type {CommerceProduct, CommerceSource, MarketplaceSeller} from '../store/commerceTypes';

const SEARCH_DEBOUNCE_MS = 350;

export type CommerceExploreScreenProps = {
  source: CommerceSource;
  shellHeader: React.ReactNode;
  /** Tri de départ (Nouveautés : « Tout voir » de l'accueil). */
  initialSort?: SortKey;
  onOpenProduct: (product: CommerceProduct) => void;
  /** Marketplace seulement. */
  onOpenSeller?: (seller: MarketplaceSeller) => void;
};

export function CommerceExploreScreen({
  source,
  shellHeader,
  initialSort = DEFAULT_SORT,
  onOpenProduct,
  onOpenSeller,
}: CommerceExploreScreenProps) {
  const stores = COMMERCE_STORES[source];
  const sellersStore = MARKETPLACE_STORES.sellers;
  const {t} = useTranslation();
  const {colors, spacing, radii, glass, touch} = useTheme();
  const [tab, setTab] = useState<ExploreTab>('search');
  const [text, setText] = useState('');
  const [sort, setSort] = useState<SortKey>(initialSort);

  const cat = useSyncExternalStore(stores.catalogue.subscribe, stores.catalogue.getState);
  const categories = useSyncExternalStore(stores.categories.subscribe, stores.categories.getState);
  const sellers = useSyncExternalStore(sellersStore.subscribe, sellersStore.getState);

  useEffect(() => {
    void stores.catalogue.load();
    void stores.categories.load();
  }, [stores]);

  useEffect(() => {
    if (source === 'marketplace' && tab === 'sellers') {
      void sellersStore.load();
    }
  }, [source, tab, sellersStore]);

  // Recherche différée : un appel par pause de saisie, jamais à chaque lettre.
  useEffect(() => {
    const id = setTimeout(() => void stores.catalogue.setQuery(text), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [stores, text]);

  const open = useCallback((p: CommerceProduct) => onOpenProduct(p), [onOpenProduct]);
  const sorted = useMemo(() => sortProducts(cat.items, sort), [cat.items, sort]);
  const tabs = useMemo(
    () => exploreTabsFor(source).map(id => ({id, label: t(`commerce.shell.exploreTabs.${id}`)})),
    [source, t],
  );

  const filtering = cat.query.trim() !== '' || cat.category !== null;
  const loading = cat.status === 'loading' || cat.status === 'idle';

  const clearFilters = () => {
    setText('');
    void stores.catalogue.setQuery('');
    void stores.catalogue.setCategory(null);
  };

  const pickCategory = (slug: string | null) => {
    void stores.catalogue.setCategory(slug);
    setTab('search');
  };

  let body: React.ReactNode;
  if (tab === 'categories') {
    body =
      categories.items.length === 0 ? (
        <EmptyState
          title={t('mp.categoriesPage.emptyTitle')}
          message={t('mp.categoriesPage.emptyHint')}
          testID="commerce-categories-empty"
        />
      ) : (
        <View style={{gap: spacing.sm, paddingHorizontal: spacing.xl}} testID="commerce-categories">
          {categories.items.map(c => {
            const name = t(categoryKeys(source, c.slug), {defaultValue: c.slug});
            return (
              <Pressable
                key={c.slug}
                onPress={() => pickCategory(c.slug)}
                accessibilityRole="button"
                accessibilityLabel={t('app.catalogue.filterCategory', {name})}
                testID={`commerce-category-${c.slug}`}
                style={{
                  alignItems: 'center',
                  backgroundColor: glass.bg,
                  borderColor: glass.border,
                  borderRadius: radii.lg,
                  borderWidth: 1,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  minHeight: touch.min,
                  paddingHorizontal: spacing.lg,
                }}>
                <Text variant="cardTitle">{name}</Text>
                <Icon name="ChevronRightIcon" size={20} color={colors.textSecondary} />
              </Pressable>
            );
          })}
        </View>
      );
  } else if (tab === 'sellers') {
    if (sellers.sellers.length === 0 && (sellers.status === 'idle' || sellers.status === 'loading')) {
      body = <LoadingState accessibilityLabel={t('content.loading')} />;
    } else if (sellers.sellers.length === 0 && sellers.status === 'error') {
      body = (
        <ErrorState
          message={t(commerceErrorKey(sellers.errorKind))}
          retryLabel={t('common.retry')}
          onRetry={() => void sellersStore.load({force: true})}
          testID="commerce-sellers-error"
        />
      );
    } else if (sellers.sellers.length === 0) {
      body = (
        <EmptyState
          title={t('mp.sellersPage.emptyTitle')}
          message={t('mp.sellersPage.emptyHint')}
          testID="commerce-sellers-empty"
        />
      );
    } else {
      body = (
        <View style={{gap: spacing.md, paddingHorizontal: spacing.xl}} testID="commerce-sellers">
          {sellers.sellers.map(s => (
            <Pressable
              key={s.memberId}
              onPress={() => onOpenSeller?.(s)}
              accessibilityRole="button"
              accessibilityLabel={s.storeName}
              testID={`seller-card-${s.memberId}`}
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
              <View style={{width: 60}}>
                <ProductCover coverUrl={null} title={s.storeName} aspect={1} initialVariant="title" />
              </View>
              <View style={{flex: 1, gap: 3}}>
                <Text variant="cardTitle" numberOfLines={1}>
                  {s.storeName}
                </Text>
                {s.bio ? (
                  <Text variant="bodySmall" color="secondary" numberOfLines={2}>
                    {s.bio}
                  </Text>
                ) : null}
                <Text variant="caption" color="secondary">
                  {t('mp.sellersPage.count', {count: s.productsCount})}
                  {s.rating !== null
                    ? ` · ${t('commerce.sellerRating', {value: s.rating.toFixed(1)})}`
                    : ''}
                </Text>
              </View>
              <Icon name="ChevronRightIcon" size={20} color={colors.textSecondary} />
            </Pressable>
          ))}
        </View>
      );
    }
  } else if (loading && cat.items.length === 0) {
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
  } else if (cat.items.length === 0) {
    body = (
      <View style={{gap: spacing.md}}>
        <EmptyState
          message={filtering ? t('mp.explore.emptyHint') : t('mp.home.emptyTitle')}
          testID="commerce-empty"
        />
        {filtering ? (
          <View style={{paddingHorizontal: spacing.xl}}>
            <Button
              variant="secondary"
              label={t('mp.explore.clearFilters')}
              onPress={clearFilters}
              testID="commerce-clear-filters"
            />
          </View>
        ) : null}
      </View>
    );
  } else {
    body = (
      <View style={{gap: spacing.lg}}>
        <View
          style={{
            alignItems: 'center',
            flexDirection: 'row',
            gap: spacing.md,
            justifyContent: 'space-between',
            paddingHorizontal: spacing.xl,
          }}>
          <Text variant="subtitle" accessibilityRole="header" testID="commerce-count">
            {t('mp.explore.results', {count: sorted.length})}
          </Text>
          <SortMenu value={sort} onChange={setSort} />
        </View>
        <ProductGrid items={sorted} onOpenProduct={open} testID="commerce-results" />
      </View>
    );
  }

  return (
    <ScrollView
      style={{flex: 1, backgroundColor: colors.bgApp}}
      contentContainerStyle={{gap: spacing.lg, paddingBottom: spacing.xxxl}}
      keyboardShouldPersistTaps="handled"
      testID={`screen-${source}-explore`}>
      {shellHeader}
      <CommerceUnderTabs
        tabs={tabs}
        active={tab}
        onChange={setTab}
        accessibilityLabel={t('commerce.shell.exploreTabsLabel')}
      />
      {tab === 'search' ? (
        <>
          <CommerceSearchField
            value={text}
            onChangeText={setText}
            placeholder={t('commerce.shell.searchCatalogue')}
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
