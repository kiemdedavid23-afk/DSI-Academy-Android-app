/**
 * Maison de contenu (Bibliothèque, Vidéothèque, Formations, Audiothèque) :
 * bandeau de la maison puis deux sections.
 *  · Découvrir : mise en avant, reprise, nouveautés, catégories, rangées (site : createHousePages.jsx).
 *  · Explorer : recherche, catégories, grille (recherche conservée de l'app).
 * Source site : LibraryPages.jsx / ContentLists.jsx. Ne parle qu'aux stores (R-LAY-5).
 */

import React, {useCallback, useEffect, useMemo, useState, useSyncExternalStore} from 'react';
import {ActivityIndicator, FlatList, Pressable, ScrollView, View} from 'react-native';
import type {Content} from '@core/utils/contentDisplay';
import {
  EmptyState,
  ErrorState,
  Icon,
  LoadingState,
  Text,
  TextField,
  useTheme,
} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {continueStore, type ContinueEntry} from '@shared/store';
import {
  continueContentId,
  HOUSE_VISUALS,
  type HouseId,
} from '@shared/houses/houseVisuals';
import {CategoryChips} from '../components/CategoryChips';
import {ContentCard} from '../components/ContentCard';
import {ContentFeatured} from '../components/ContentFeatured';
import {ContentRail} from '../components/ContentRail';
import {HouseBanner, type HouseSection} from '../components/HouseBanner';
import {contentErrorKey} from '../logic/errorKey';
import {isRecent} from '../logic/recent';
import {HOUSE_STORES, type DiscoverHouse} from '../store/houseStores';
import {contentDetailStore} from '../store/detailStore';
import {HOUSE_RAILS} from '../store/railsStore';

const SEARCH_DEBOUNCE_MS = 350;
const NEW_RAIL_SIZE = 10;
const RESUME_ICON_BOX = 42;

export type LibraryDiscoverScreenProps = {
  /** Maison affichée (défaut : Bibliothèque). */
  house?: DiscoverHouse;
  onOpenItem: (item: Content) => void;
  /** Ouvre une fiche par son identifiant (rangée « Reprendre »). */
  onOpenId?: (id: number) => void;
  /** Passe à une autre maison depuis le sélecteur du bandeau. */
  onSwitchHouse?: (house: HouseId) => void;
};

export function LibraryDiscoverScreen({
  house = 'library',
  onOpenItem,
  onOpenId,
  onSwitchHouse,
}: LibraryDiscoverScreenProps) {
  const stores = HOUSE_STORES[house];
  const railsStore = HOUSE_RAILS[house];
  const visual = HOUSE_VISUALS[house];
  const {t} = useTranslation();
  const {colors, spacing, radii, glass} = useTheme();
  const [text, setText] = useState('');
  const [section, setSection] = useState<HouseSection>('discover');
  const [entry, setEntry] = useState<ContinueEntry | null>(null);

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
  const rails = useSyncExternalStore(railsStore.subscribe, railsStore.getState);

  useEffect(() => {
    void stores.catalogue.load();
    void stores.categories.load();
    void railsStore.load();
  }, [stores, railsStore]);

  useEffect(() => {
    let alive = true;
    void continueStore.get().then(e => {
      if (alive) {
        setEntry(e);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

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

  const banner = (
    <HouseBanner
      houseId={house}
      section={section}
      onSwitchHouse={onSwitchHouse}
      onSection={setSection}
    />
  );

  /* ------------------------------ DÉCOUVRIR ------------------------------ */
  if (section === 'discover') {
    const featured = rails.newest[0];
    const newRail = rails.newest.slice(1, 1 + NEW_RAIL_SIZE);
    const resumeId = entry && entry.house === house ? continueContentId(entry) : null;
    const railsLoading = rails.status === 'loading' || rails.status === 'idle';

    let body: React.ReactNode = null;
    if (railsLoading) {
      body = <LoadingState accessibilityLabel={t('content.loading')} />;
    } else if (rails.status === 'error') {
      body = (
        <ErrorState
          message={t(contentErrorKey(rails.errorKind))}
          retryLabel={t('common.retry')}
          onRetry={() => void railsStore.load({force: true})}
          testID="library-error"
        />
      );
    } else if (!featured) {
      body = <EmptyState message={t('content.categoryEmpty')} testID="library-empty" />;
    } else {
      body = (
        <>
          <ContentFeatured
            item={featured}
            eyebrow={t('content.discoverTitle')}
            ctaLabel={t('content.discoverCta')}
            onPress={open}
          />

          {resumeId !== null && entry && onOpenId ? (
            <View>
              <Pressable
                onPress={() => onOpenId(resumeId)}
                accessibilityRole="button"
                testID="library-resume"
                style={{
                  alignItems: 'center',
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.goldBorder,
                  borderRadius: radii.lg,
                  borderWidth: 1,
                  flexDirection: 'row',
                  gap: spacing.md,
                  paddingHorizontal: 15.5,
                  paddingVertical: 13.5,
                }}>
                <View
                  style={{
                    alignItems: 'center',
                    backgroundColor: colors.bgSurfaceAlt,
                    borderColor: colors.borderLight,
                    borderRadius: radii.md,
                    borderWidth: 1,
                    height: RESUME_ICON_BOX,
                    justifyContent: 'center',
                    width: RESUME_ICON_BOX,
                  }}>
                  <Icon name={visual.icon} size={22} color={colors.textSecondary} />
                </View>
                <View style={{flex: 1}}>
                  <Text variant="micro" color="muted" style={{textTransform: 'uppercase'}}>
                    {t('content.continueSection')}
                  </Text>
                  <Text variant="cardTitle" numberOfLines={1}>
                    {entry.title}
                  </Text>
                </View>
              </Pressable>
            </View>
          ) : null}

          {newRail.length > 0 ? (
            <ContentRail
              title={t('content.newTitle')}
              houseId={house}
              items={newRail}
              categoryName={categoryName}
              onOpen={open}
              onSeeAll={() => {
                void stores.catalogue.setCategory(null);
                setSection('explore');
              }}
              testID="rail-new"
            />
          ) : null}

          {categoryList.length > 0 ? (
            <View style={{gap: spacing.md}}>
              <Text
                variant="subtitle"
                accessibilityRole="header"
                style={{paddingHorizontal: 2.5}}>
                {t('content.browseByCategory')}
              </Text>
              <CategoryChips
                categories={categoryList}
                selectedId={null}
                onSelect={id => {
                  void stores.catalogue.setCategory(id);
                  setSection('explore');
                }}
              />
            </View>
          ) : null}

          {rails.rails.map(r => (
            <ContentRail
              key={r.categoryId}
              title={r.name}
              houseId={house}
              items={r.items}
              categoryName={categoryName}
              onOpen={open}
              onSeeAll={() => {
                void stores.catalogue.setCategory(r.categoryId);
                setSection('explore');
              }}
              testID={`rail-category-${r.categoryId}`}
            />
          ))}
        </>
      );
    }

    return (
      <ScrollView
        style={{flex: 1, backgroundColor: colors.bgApp}}
        contentContainerStyle={{gap: spacing.xxl, paddingBottom: spacing.xxxl, paddingTop: spacing.xxl}}
        testID="screen-library">
        {banner}
        {body}
      </ScrollView>
    );
  }

  /* ------------------------------- EXPLORER ------------------------------- */
  const wide = visual.kind === 'video' || visual.kind === 'course';
  const columns = wide ? 1 : 2;

  const header = (
    <View style={{gap: spacing.md, paddingBottom: spacing.md}}>
      {banner}
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
        key={columns}
        numColumns={columns}
        keyExtractor={item => String(item.id)}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={header}
        ListEmptyComponent={body ?? undefined}
        columnWrapperStyle={
          columns > 1 ? {gap: spacing.md, paddingHorizontal: spacing.xl} : undefined
        }
        contentContainerStyle={{gap: spacing.lg, paddingTop: spacing.xxl, paddingBottom: spacing.xxxl}}
        renderItem={({item}) => (
          <View style={columns > 1 ? {flex: 1} : {paddingHorizontal: spacing.xl}}>
            <ContentCard
              item={item}
              categoryName={categoryName(item)}
              badge={isRecent(item.createdAt) ? t('content.newBadge') : null}
              onPress={open}
            />
          </View>
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
