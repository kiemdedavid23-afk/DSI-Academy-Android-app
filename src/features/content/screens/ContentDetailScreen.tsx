/**
 * Fiche détail d'un contenu (site : ContentDetail.jsx + ContentDetail.css).
 * Héros : la vignette occupe toute la carte, les textes se lisent dessus
 * (dégradé sombre). Conservé de l'app : tableau d'informations (auteur,
 * catégorie, niveau, langue, durée).
 */

import React, {useEffect, useState, useSyncExternalStore} from 'react';
import {Image, Pressable, ScrollView, Share, StyleSheet, View} from 'react-native';
import type {Content, ContentType} from '@core/utils/contentDisplay';
import {contentAuthor, formatDuration, levelKey} from '@core/utils/contentDisplay';
import {
  ErrorState,
  Icon,
  LoadingState,
  Scrim,
  Text,
  useTheme,
  withAlpha,
  type IconName,
} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {favoritesStore, selectionsStore} from '@shared/store';
import {HOUSE_VISUALS, houseOfType} from '@shared/houses/houseVisuals';
import {ContentRail} from '../components/ContentRail';
import {contentErrorKey} from '../logic/errorKey';
import {isRecent} from '../logic/recent';
import {libraryCategoriesStore} from '../store/categoriesStore';
import {contentDetailStore} from '../store/detailStore';
import {contentSimilarStore} from '../store/similarStore';

/** Hauteur minimale du héros selon le format (site : .dsi-cd-hero). */
const HERO_MIN = {book: 440, video: 340, course: 340, audio: 400} as const;
const ROUND = 48;
const LONG_TEXT = 220;
const PRIMARY_ICON: Record<ContentType, IconName> = {
  book: 'BookIcon',
  video: 'PlayIcon',
  audio: 'HeadphonesIcon',
  training: 'GraduationIcon',
};

export type ContentDetailScreenProps = {
  id: number;
  onRead: (
    id: number,
    title: string,
    type?: ContentType,
    thumbnailUrl?: string | null,
  ) => void;
  /** Ouvre la fiche d'un contenu de la rangée « Dans la même catégorie ». */
  onOpenItem?: (item: Content) => void;
};

export function ContentDetailScreen({id, onRead, onOpenItem}: ContentDetailScreenProps) {
  const {t} = useTranslation();
  const {colors, spacing, radii, glass} = useTheme();
  const st = useSyncExternalStore(
    contentDetailStore.subscribe,
    contentDetailStore.getState,
  );
  const categories = useSyncExternalStore(
    cb => libraryCategoriesStore.subscribe(() => cb()),
    () => libraryCategoriesStore.getState(),
  );
  const similar = useSyncExternalStore(
    contentSimilarStore.subscribe,
    contentSimilarStore.getState,
  );

  const [favorite, setFavorite] = useState(false);
  const [selected, setSelected] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    void favoritesStore.has(String(id)).then(v => {
      if (alive) {
        setFavorite(v);
      }
    });
    void selectionsStore.has(String(id)).then(v => {
      if (alive) {
        setSelected(v);
      }
    });
    setExpanded(false);
    setImageFailed(false);
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    void contentDetailStore.load(id);
    void libraryCategoriesStore.load();
  }, [id]);

  const loaded = st.id === id && st.status === 'success' ? st.item : null;
  useEffect(() => {
    if (loaded) {
      void contentSimilarStore.load(loaded);
    }
  }, [loaded]);

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
  const houseId = houseOfType(item.type);
  const visual = HOUSE_VISUALS[houseId];
  const author = contentAuthor(item);
  const duration = formatDuration(item.durationSeconds);
  const lk = levelKey(item.level);
  const categoryName =
    categories.data?.find(c => c.id === item.categoryId)?.name ?? null;
  const description = item.description ?? '';
  const longText = description.length > LONG_TEXT;
  const heroImage =
    item.thumbnailUrl && !imageFailed ? {uri: item.thumbnailUrl} : visual.image;
  const dark = withAlpha(colors.bgDarkPremium, 0.55);

  const chips: string[] = [];
  if (isRecent(item.createdAt)) {
    chips.push(t('content.newBadge'));
  }
  if (lk) {
    chips.push(t(`houses.filters.${lk}`));
  }
  if (duration) {
    chips.push(duration);
  }

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

  const entry = {
    id: String(item.id),
    house: houseId,
    title: item.title,
    path: '',
  };

  const primaryLabel =
    item.type === 'audio'
      ? t('app.player.listen')
      : item.type === 'video'
      ? t('app.player.watch')
      : item.type === 'training'
      ? t('app.formation.open')
      : t('app.reader.read');

  const roundButton = (
    active: boolean,
    icon: IconName,
    label: string,
    onPress: () => void,
    testID: string,
  ) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{selected: active}}
      testID={testID}
      style={{
        alignItems: 'center',
        backgroundColor: active ? withAlpha(colors.goldPrestige, 0.3) : dark,
        borderColor: active ? colors.goldPrestige : withAlpha(colors.textOnDark, 0.3),
        borderRadius: radii.round,
        borderWidth: 1,
        height: ROUND,
        justifyContent: 'center',
        width: ROUND,
      }}>
      <Icon name={icon} size={22} color={colors.textOnDark} />
    </Pressable>
  );

  const card = {
    backgroundColor: glass.bg,
    borderColor: glass.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
    marginHorizontal: spacing.xl,
    padding: spacing.lg,
  } as const;

  return (
    <ScrollView
      style={{flex: 1, backgroundColor: colors.bgApp}}
      contentContainerStyle={{gap: spacing.xxl, paddingBottom: spacing.xxxl, paddingTop: spacing.xl}}
      testID="screen-content-detail">
      <View
        style={[
          styles.hero,
          {
            backgroundColor: colors.bgDarkPremium,
            borderColor: colors.goldBorder,
            borderRadius: radii.lg,
            marginHorizontal: spacing.xl,
            minHeight: HERO_MIN[visual.kind],
            padding: spacing.xl,
          },
        ]}>
        <Image
          source={heroImage}
          style={styles.fill}
          resizeMode="cover"
          onError={() => setImageFailed(true)}
          accessible={false}
        />
        <Scrim from={0.3} to={0.92} />
        <View style={{gap: spacing.md, alignItems: 'flex-start'}}>
          {chips.length > 0 ? (
            <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm}}>
              {chips.map(chip => (
                <View
                  key={chip}
                  style={{
                    backgroundColor: withAlpha(colors.goldPrestige, 0.16),
                    borderColor: colors.goldBorder,
                    borderRadius: radii.pill,
                    borderWidth: 1,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.xs,
                  }}>
                  <Text variant="captionStrong" color="onDark">
                    {chip}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
          <Text variant="title" color="onDark" accessibilityRole="header">
            {item.title}
          </Text>
          {author ? (
            <Text variant="bodyMedium" color="onDark" style={{opacity: 0.88}}>
              {author}
            </Text>
          ) : null}
          <View style={{alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs}}>
            <Pressable
              onPress={() => onRead(item.id, item.title, item.type, item.thumbnailUrl)}
              accessibilityRole="button"
              accessibilityLabel={primaryLabel}
              testID="detail-open"
              style={{
                alignItems: 'center',
                backgroundColor: colors.goldPrestige,
                borderRadius: radii.md,
                flexDirection: 'row',
                gap: spacing.sm,
                justifyContent: 'center',
                minHeight: ROUND,
                minWidth: 170,
                paddingHorizontal: spacing.xl,
              }}>
              <Icon name={PRIMARY_ICON[item.type]} size={20} color={colors.bgDarkPremium} />
              <Text variant="button" style={{color: colors.bgDarkPremium}}>
                {primaryLabel}
              </Text>
            </Pressable>
            {roundButton(
              favorite,
              'BookmarkIcon',
              favorite ? t('content.detail.removeFav') : t('content.detail.addFav'),
              () => void favoritesStore.toggle(entry).then(setFavorite),
              'detail-favorite',
            )}
            {roundButton(
              selected,
              selected ? 'CheckIcon' : 'PlusIcon',
              selected ? t('content.detail.removeSel') : t('content.detail.addSel'),
              () => void selectionsStore.toggle(entry).then(setSelected),
              'detail-select',
            )}
            {roundButton(
              false,
              'ShareIcon',
              t('content.detail.share'),
              () => {
                void Share.share({title: item.title, message: item.title}).catch(() => undefined);
              },
              'detail-share',
            )}
          </View>
        </View>
      </View>

      {description ? (
        <View style={card}>
          <Text variant="subtitle" accessibilityRole="header">
            {t('content.detail.aboutTitle')}
          </Text>
          <Text variant="bodyMedium" numberOfLines={expanded || !longText ? undefined : 4}>
            {description}
          </Text>
          {longText ? (
            <Pressable
              onPress={() => setExpanded(v => !v)}
              accessibilityRole="button"
              testID="detail-more"
              style={{alignSelf: 'flex-start'}}>
              <Text variant="bodySmallStrong" color="secondary" style={{textDecorationLine: 'underline'}}>
                {expanded ? t('content.detail.readLess') : t('content.detail.readMore')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {facts.length > 0 ? (
        <View style={card}>
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

      {similar.id === item.id && similar.items.length > 0 && onOpenItem ? (
        <ContentRail
          title={t('content.detail.similarTitle')}
          houseId={houseId}
          items={similar.items}
          onOpen={it => {
            contentDetailStore.seed(it);
            onOpenItem(it);
          }}
          testID="rail-similar"
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: {...StyleSheet.absoluteFillObject},
  hero: {borderWidth: 1, justifyContent: 'flex-end', overflow: 'hidden'},
});
