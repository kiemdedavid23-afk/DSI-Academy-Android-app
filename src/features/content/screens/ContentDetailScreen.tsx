/**
 * Fiche détail d'un contenu (site : ContentDetail.jsx).
 * Le bouton de lecture arrive avec les lecteurs (L4e) : ici il est désactivé.
 */

import React, {useEffect, useState, useSyncExternalStore} from 'react';
import {ScrollView, View} from 'react-native';
import type {ContentType} from '@core/utils/contentDisplay';
import {contentAuthor, formatDuration, levelKey} from '@core/utils/contentDisplay';
import {
  Button,
  ErrorState,
  LoadingState,
  Text,
  useTheme,
} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {favoritesStore} from '@shared/store';
import {ContentCover} from '../components/ContentCover';
import {contentErrorKey} from '../logic/errorKey';
import {libraryCategoriesStore} from '../store/categoriesStore';
import {contentDetailStore} from '../store/detailStore';

export type ContentDetailScreenProps = {
  id: number;
  onRead: (
    id: number,
    title: string,
    type?: ContentType,
    thumbnailUrl?: string | null,
  ) => void;
};

export function ContentDetailScreen({id, onRead}: ContentDetailScreenProps) {
  const {t} = useTranslation();
  const {colors, spacing, radii} = useTheme();
  const st = useSyncExternalStore(
    contentDetailStore.subscribe,
    contentDetailStore.getState,
  );
  const categories = useSyncExternalStore(
    cb => libraryCategoriesStore.subscribe(() => cb()),
    () => libraryCategoriesStore.getState(),
  );

  const [favorite, setFavorite] = useState(false);

  useEffect(() => {
    let alive = true;
    void favoritesStore.has(String(id)).then(v => {
      if (alive) {
        setFavorite(v);
      }
    });
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    void contentDetailStore.load(id);
    void libraryCategoriesStore.load();
  }, [id]);

  if (st.id !== id || st.status === 'loading' || st.status === 'idle') {
    return <LoadingState fill accessibilityLabel={t('content.loading')} />;
  }
  if (st.status === 'error' || !st.item) {
    return (
      <ErrorState
        message={t(contentErrorKey(st.errorKind))}
        retryLabel={t('common.retry')}
        onRetry={() => void contentDetailStore.load(id, {force: true})}
        testID="detail-error"
      />
    );
  }

  const item = st.item;
  const author = contentAuthor(item);
  const duration = formatDuration(item.durationSeconds);
  const lk = levelKey(item.level);
  const categoryName =
    categories.data?.find(c => c.id === item.categoryId)?.name ?? null;

  const facts: Array<[string, string]> = [];
  if (author) {
    facts.push([t('app.catalogue.author'), author]);
  }
  if (categoryName) {
    facts.push([t('app.catalogue.category'), categoryName]);
  }
  if (lk) {
    facts.push([t('app.catalogue.level'), t(`houses.filters.${lk}`)]);
  }
  if (item.language) {
    facts.push([t('app.catalogue.language'), item.language.toUpperCase()]);
  }
  if (duration) {
    facts.push([t('app.catalogue.duration'), duration]);
  }

  return (
    <ScrollView
      style={{flex: 1, backgroundColor: colors.bgApp}}
      contentContainerStyle={{padding: spacing.xl, gap: spacing.lg}}
      testID="screen-content-detail">
      <View style={{width: '55%', alignSelf: 'center'}}>
        <ContentCover thumbnailUrl={item.thumbnailUrl} />
      </View>
      <Text variant="heading" accessibilityRole="header">
        {item.title}
      </Text>
      {facts.length > 0 ? (
        <View
          style={{
            gap: spacing.sm,
            padding: spacing.lg,
            borderRadius: radii.lg,
            borderWidth: 1,
            borderColor: colors.borderLight,
            backgroundColor: colors.bgSurface,
          }}>
          {facts.map(([label, value]) => (
            <View
              key={label}
              style={{flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md}}>
              <Text variant="bodySmall" color="muted">
                {label}
              </Text>
              <Text variant="bodySmallStrong" style={{flexShrink: 1, textAlign: 'right'}}>
                {value}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {item.description ? (
        <View style={{gap: spacing.sm}}>
          <Text variant="subtitle">{t('app.catalogue.about')}</Text>
          <Text variant="body" color="secondary">
            {item.description}
          </Text>
        </View>
      ) : null}
      <Button
        label={
          item.type === 'audio'
            ? t('app.player.listen')
            : item.type === 'video'
            ? t('app.player.watch')
            : t('app.reader.read')
        }
        onPress={() => onRead(item.id, item.title, item.type, item.thumbnailUrl)}
        testID="detail-open"
      />
      <Button
        label={favorite ? t('app.reader.removeFavorite') : t('app.reader.addFavorite')}
        variant="secondary"
        onPress={() =>
          void favoritesStore
            .toggle({
              id: String(item.id),
              house:
                item.type === 'audio' ? 'audio' : item.type === 'video' ? 'videos' : 'library',
              title: item.title,
              path: '',
            })
            .then(setFavorite)
        }
        testID="detail-favorite"
      />
    </ScrollView>
  );
}
