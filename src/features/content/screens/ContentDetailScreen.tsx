/**
 * Fiche détail d'un contenu (site : ContentDetail.jsx + ContentDetail.css).
 * Héros (mesuré sur les captures du site, 720 px = 360 dp) : carte pleine largeur,
 * l'image du contenu occupe TOUTE la carte (dégradé sombre dessus), bouton
 * « Retour » en haut à gauche, puis pastille, titre et boutons centrés.
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
import {ContentCover} from '../components/ContentCover';
import {ContentRail} from '../components/ContentRail';
import {PartsSection} from '../components/PartsSection';
import {contentErrorKey} from '../logic/errorKey';
import type {ProgramModule} from '../logic/formationTree';
import {isRecent} from '../logic/recent';
import {contentDetailStore} from '../store/detailStore';
import {contentSimilarStore} from '../store/similarStore';

/** Hauteur minimale du héros selon le format (site : .dsi-cd-hero). */
const HERO_MIN = {book: 602, video: 340, course: 340, audio: 400} as const;
const ROUND = 45;
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
  /** Ouvre une partie (lecteur ou lecteur audio/vidéo) depuis la section « Parties ». */
  onOpenModule?: (module: ProgramModule) => void;
  /** Ouvre la liste des parties d'une œuvre composée (livre, audio, vidéo). */
  onOpenParts?: (id: number, title: string, type: ContentType) => void;
  /** Ouvre la fiche d'un contenu de la rangée « Dans la même catégorie ». */
  onOpenItem?: (item: Content) => void;
  /** Bouton « Retour » du héros. */
  onBack?: () => void;
};

export function ContentDetailScreen({id, onRead, onOpenParts, onOpenModule, onOpenItem, onBack}: ContentDetailScreenProps) {
  const {t} = useTranslation();
  const {colors, spacing, radii} = useTheme();
  const st = useSyncExternalStore(
    contentDetailStore.subscribe,
    contentDetailStore.getState,
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
  if (item.partsCount > 0) {
    chips.push(t('content.partsCount', {count: item.partsCount}));
  }
  if (item.likeCount > 0) {
    chips.push(t('content.likeCount', {count: item.likeCount}));
  }
  // Œuvre composée hors formation : le bouton ouvre la liste de ses parties.
  const opensParts = item.partsCount > 0 && item.type !== 'training' && !!onOpenParts;

  const entry = {
    id: String(item.id),
    house: houseId,
    title: item.title,
    path: '',
  };

  const primaryLabel = opensParts
    ? t('content.openParts')
    : item.type === 'audio'
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
    backgroundColor: colors.bgSurface,
    borderRadius: radii.lg,
    gap: 11,
    paddingBottom: 21.5,
    paddingHorizontal: 25,
    paddingTop: 23,
  } as const;

  return (
    <ScrollView
      style={{flex: 1, backgroundColor: colors.bgApp}}
      contentContainerStyle={{gap: spacing.xxl, paddingBottom: spacing.xxxl, paddingTop: 28.5}}
      testID="screen-content-detail">
      <View
        style={[
          styles.hero,
          {
            backgroundColor: colors.houseBannerBg,
            borderColor: colors.goldBorder,
            borderRadius: radii.lg,
            minHeight: HERO_MIN[visual.kind],
            paddingBottom: 48,
            paddingHorizontal: spacing.xl,
            paddingTop: 17,
          },
        ]}>
        <Image
          source={heroImage}
          style={styles.fill}
          resizeMode="cover"
          onError={() => setImageFailed(true)}
          accessible={false}
        />
        <Scrim from={0.2} to={0.92} />
        <View style={{alignItems: 'flex-start'}}>
          {onBack ? (
            <Pressable
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
              testID="detail-back"
              style={{
                alignItems: 'center',
                backgroundColor: withAlpha(colors.bgDarkPremium, 0.8),
                borderRadius: radii.pill,
                height: 33,
                justifyContent: 'center',
                paddingHorizontal: 13.5,
              }}>
              <Text variant="bodySmallStrong" color="onDark">
                {t('common.back')}
              </Text>
            </Pressable>
          ) : null}
        </View>
        <ContentCover
          thumbnailUrl={item.thumbnailUrl}
          houseId={houseId}
          style={{
            alignSelf: 'center',
            borderColor: colors.goldBorder,
            marginVertical: 16,
            width: visual.kind === 'book' ? '50%' : '86%',
          }}
        />
        <View style={{alignItems: 'center', gap: 14}}>
          {chips.length > 0 ? (
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: spacing.sm,
                justifyContent: 'center',
              }}>
              {chips.map(chip => (
                <View
                  key={chip}
                  style={{
                    backgroundColor: withAlpha(colors.goldPrestige, 0.16),
                    borderColor: colors.goldBorder,
                    borderRadius: radii.pill,
                    borderWidth: 1,
                    paddingHorizontal: 11,
                    paddingVertical: 3,
                  }}>
                  <Text variant="bodySmallStrong" color="onDark" style={{fontSize: 13}}>
                    {chip}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
          <Text
            variant="title"
            color="onDark"
            accessibilityRole="header"
            style={{textAlign: 'center'}}>
            {item.title}
          </Text>
          {author ? (
            <Text
              variant="bodyMedium"
              color="onDark"
              style={{opacity: 0.88, textAlign: 'center'}}>
              {author}
            </Text>
          ) : null}
          <View
            style={{
              alignItems: 'center',
              alignSelf: 'stretch',
              flexDirection: 'row',
              gap: 10,
              justifyContent: 'center',
              marginTop: 7,
            }}>
            <Pressable
              onPress={() =>
                opensParts && onOpenParts
                  ? onOpenParts(item.id, item.title, item.type)
                  : onRead(item.id, item.title, item.type, item.thumbnailUrl)
              }
              accessibilityRole="button"
              accessibilityLabel={primaryLabel}
              testID="detail-open"
              style={{
                alignItems: 'center',
                backgroundColor: colors.goldPrestige,
                borderRadius: radii.md,
                flexDirection: 'row',
                gap: spacing.sm,
                flex: 1,
                justifyContent: 'center',
                minHeight: 51.5,
                minWidth: 0,
                paddingHorizontal: spacing.md,
              }}>
              <Icon name={PRIMARY_ICON[item.type]} size={20} color={colors.bgDarkPremium} />
              <Text variant="bodyStrong" style={{color: colors.bgDarkPremium}}>
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
          <Text
            variant="bodyMedium"
            color="secondary"
            style={{lineHeight: 24}}
            numberOfLines={expanded || !longText ? undefined : 4}>
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

      {item.partsCount > 0 && onOpenModule ? (
        <PartsSection id={item.id} title={item.title} house={houseId} onOpenModule={onOpenModule} />
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
  fill: {position: 'absolute', top: 0, left: 0, right: 0, bottom: 0},
  hero: {borderWidth: 1, justifyContent: 'space-between', overflow: 'hidden'},
});
