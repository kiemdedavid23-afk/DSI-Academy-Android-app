/**
 * Bibliothèque : découverte (catalogue, catégories, recherche).
 * Source site : LibraryPages.jsx / ContentLists.jsx. Ne parle qu'aux stores (R-LAY-5).
 */

import React, {useCallback, useEffect, useMemo, useState, useSyncExternalStore} from 'react';
import {ActivityIndicator, FlatList, View} from 'react-native';
import type {Content} from '@core/utils/contentDisplay';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  Text,
  TextField,
  useTheme,
} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {CategoryChips} from '../components/CategoryChips';
import {ContentCard} from '../components/ContentCard';
import {contentErrorKey} from '../logic/errorKey';
import {HOUSE_STORES, type DiscoverHouse} from '../store/houseStores';
import {contentDetailStore} from '../store/detailStore';

const SEARCH_DEBOUNCE_MS = 350;
const COLUMNS = 2;

export type LibraryDiscoverScreenProps = {
  /** Maison affichée (défaut : Bibliothèque). */
  house?: DiscoverHouse;
  onOpenItem: (item: Content) => void;
};

export function LibraryDiscoverScreen({house = 'library', onOpenItem}: LibraryDiscoverScreenProps) {
  const stores = HOUSE_STORES[house];
  const {t} = useTranslation();
  const {colors, spacing} = useTheme();
  const [text, setText] = useState('');

  const cat = useSyncExternalStore(
    stores.catalogue.subscribe,
    stores.catalogue.getState,
  );
  const search = useSyncExternalStore(
    stores.search.subscribe,
    stores.search.getState,
  );
  const categories = useSyncExternalStore(
    cb => stores.categories.subscribe(() => cb()),
    () => stores.categories.getState(),
  );

  useEffect(() => {
    void stores.catalogue.load();
    void stores.categories.load();
  }, [stores]);

  // Recherche différée : un appel par pause de saisie, jamais à chaque lettre.
  useEffect(() => {
    const id = setTimeout(
      () => void stores.search.setQuery(text),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(id);
  }, [stores, text]);

  const searching = text.trim() !== '';
  const list = searching ? search : cat;
  const items = list.items;
  const loading = list.status === 'loading' || list.status === 'idle';
  const categoryList = useMemo(() => categories.data ?? [], [categories.data]);

  const categoryName = useCallback(
    (item: Content): string | null =>
      categoryList.find(c => c.id === item.categoryId)?.name ?? null,
    [categoryList],
  );

  const open = useCallback(
    (item: Content) => {
      contentDetailStore.seed(item);
      onOpenItem(item);
    },
    [onOpenItem],
  );

  const onEnd = useCallback(() => {
    if (searching) {
      void stores.search.loadMore();
    } else {
      void stores.catalogue.loadMore();
    }
  }, [searching, stores.catalogue, stores.search]);

  const header = useMemo(
    () => (
      <View style={{gap: spacing.md, paddingBottom: spacing.md}}>
        <View style={{paddingHorizontal: spacing.xl}}>
          <TextField
            label={t('app.catalogue.searchLabel')}
            value={text}
            onChangeText={setText}
            placeholder={
              house === 'audio'
                ? t('app.player.searchAudio')
                : house === 'videos'
                ? t('app.player.searchVideo')
                : house === 'formations'
                ? t('app.formation.search')
                : t('library.searchPlaceholder')
            }
            testID="library-search"
          />
        </View>
        {!searching && categoryList.length > 0 ? (
          <CategoryChips
            categories={categoryList}
            selectedId={cat.categoryId}
            onSelect={id => void stores.catalogue.setCategory(id)}
          />
        ) : null}
        {searching && list.status === 'success' && items.length > 0 ? (
          <Text
            variant="subtitle"
            style={{paddingHorizontal: spacing.xl}}
            accessibilityRole="header">
            {t('app.catalogue.resultsTitle')}
          </Text>
        ) : null}
      </View>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [text, searching, categoryList, cat.categoryId, list.status, items.length, t],
  );

  let body: React.ReactNode = null;
  if (loading && items.length === 0) {
    body = <LoadingState accessibilityLabel={t('content.loading')} />;
  } else if (list.status === 'error' && items.length === 0) {
    body = (
      <ErrorState
        message={t(contentErrorKey(list.errorKind))}
        retryLabel={t('common.retry')}
        onRetry={() =>
          searching
            ? void stores.search.setQuery(text)
            : void stores.catalogue.load({force: true})
        }
        testID="library-error"
      />
    );
  } else if (items.length === 0) {
    const message = searching
      ? t('app.catalogue.noResults')
      : cat.categoryId !== null
      ? t('content.categoryEmpty')
      : house === 'audio'
      ? t('app.player.audioEmpty')
      : house === 'videos'
      ? t('app.player.videoEmpty')
      : house === 'formations'
      ? t('app.formation.listEmpty')
      : t('app.catalogue.libraryEmpty');
    body = <EmptyState message={message} testID="library-empty" />;
  }

  return (
    <View style={{flex: 1, backgroundColor: colors.bgApp}} testID="screen-library">
      <FlatList
        data={body ? [] : items}
        key={COLUMNS}
        numColumns={COLUMNS}
        keyExtractor={item => String(item.id)}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={header}
        ListEmptyComponent={body ?? undefined}
        columnWrapperStyle={{gap: spacing.md, paddingHorizontal: spacing.xl}}
        contentContainerStyle={{gap: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxxl}}
        renderItem={({item}) => (
          <ContentCard
            item={item}
            categoryName={categoryName(item)}
            onPress={open}
          />
        )}
        onEndReached={onEnd}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          list.loadingMore ? (
            <ActivityIndicator
              color={colors.bluePrimary}
              accessibilityLabel={t('content.loading')}
            />
          ) : undefined
        }
      />
    </View>
  );
}
