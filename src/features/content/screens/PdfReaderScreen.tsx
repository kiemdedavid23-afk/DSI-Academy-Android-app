/**
 * Lecteur PDF natif (PdfRenderer, module Kotlin). Défilement vertical page par
 * page, rendu à la demande, reprise à la dernière page lue.
 * Site : PdfViewer.jsx — zoom de 100 % à 300 %, aller à une page, signets.
 * (La table des matières n'existe pas avec PdfRenderer : elle n'est pas proposée.)
 */

import React, {useCallback, useEffect, useRef, useState, useSyncExternalStore} from 'react';
import {FlatList, Image, PixelRatio, Pressable, ScrollView, View, useWindowDimensions} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {renderPdfPage} from '@core/media/pdfNative';
import {readerErrorKey} from '@core/utils/readerFailure';
import {Button, ErrorState, LoadingState, Text, TextField, useTheme, withAlpha} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {bookmarksStore} from '@shared/store';
import {pdfReaderStore, type PdfErrorKind} from '../store/pdfReaderStore';

export type PdfReaderScreenProps = {id: number; title: string};

const FIRST_PAGE_RATIO = 1.414;
const ZOOM_MIN = 1;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.25;
/** Au-delà, le rendu devient trop lourd pour la mémoire : l'image est simplement agrandie. */
const MAX_RENDER_PX = 2400;

export function pdfErrorKey(kind: PdfErrorKind | null): string {
  if (kind === 'pdfProtected') {
    return 'app.reader.pdfProtected';
  }
  if (kind === 'pdfInvalid') {
    return 'app.reader.pdfInvalid';
  }
  return readerErrorKey(kind);
}

function PdfPage({handle, index, width, height}: {handle: string; index: number; width: number; height: number}) {
  const {colors} = useTheme();
  const [uri, setUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    const px = Math.min(MAX_RENDER_PX, Math.round(PixelRatio.getPixelSizeForLayoutSize(width)));
    renderPdfPage(handle, index, px)
      .then(r => alive && setUri(r.uri))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [handle, index, width]);
  return (
    <View
      style={{width, height, backgroundColor: colors.bgApp, alignItems: 'center', justifyContent: 'center'}}
      testID={`pdf-page-${index}`}>
      {uri ? (
        <Image source={{uri}} style={{width, height}} resizeMode="contain" fadeDuration={0} />
      ) : failed ? (
        <Text variant="bodySmall">{index + 1}</Text>
      ) : null}
    </View>
  );
}

export function PdfReaderScreen({id, title}: PdfReaderScreenProps) {
  const {t} = useTranslation();
  const {colors, spacing, radii} = useTheme();
  const {width} = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const st = useSyncExternalStore(pdfReaderStore.subscribe, pdfReaderStore.getState);
  const [current, setCurrent] = useState(1);
  const [zoom, setZoom] = useState(ZOOM_MIN);
  const [panel, setPanel] = useState<'goto' | 'bookmarks' | null>(null);
  const [gotoText, setGotoText] = useState('');
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const listRef = useRef<FlatList<number>>(null);
  const currentRef = useRef(1);
  const pageWidth = Math.round(width * zoom);
  const pageHeight = Math.round(pageWidth * FIRST_PAGE_RATIO);

  useEffect(() => {
    void pdfReaderStore.open(id, title);
    return () => {
      void pdfReaderStore.close();
    };
  }, [id, title]);

  useEffect(() => {
    let alive = true;
    void bookmarksStore.list(id).then(list => {
      if (alive) {
        setBookmarks(list);
      }
    });
    return () => {
      alive = false;
    };
  }, [id]);

  // Le zoom change la hauteur des pages : on reste sur la page lue.
  useEffect(() => {
    const timer = setTimeout(() => {
      listRef.current?.scrollToIndex({index: Math.max(0, currentRef.current - 1), animated: false});
    }, 60);
    return () => clearTimeout(timer);
  }, [zoom]);

  const onViewable = useRef(({viewableItems}: {viewableItems: Array<{index?: number | null}>}) => {
    const first = viewableItems[0]?.index;
    if (typeof first === 'number') {
      currentRef.current = first + 1;
      setCurrent(first + 1);
      pdfReaderStore.reportPage(first);
    }
  }).current;

  const goTo = useCallback((page: number) => {
    listRef.current?.scrollToIndex({index: Math.max(0, page - 1), animated: false});
  }, []);

  const renderItem = useCallback(
    ({index}: {index: number}) =>
      st.handle ? <PdfPage handle={st.handle} index={index} width={pageWidth} height={pageHeight} /> : null,
    [st.handle, pageWidth, pageHeight],
  );

  if (st.status === 'loading' || st.status === 'idle') {
    return <LoadingState fill accessibilityLabel={t('content.loading')} />;
  }
  if (st.status === 'error') {
    return (
      <ErrorState
        message={t(pdfErrorKey(st.errorKind))}
        retryLabel={st.retryable ? t('common.retry') : undefined}
        onRetry={st.retryable ? () => void pdfReaderStore.open(id, title) : undefined}
        testID="reader-error"
      />
    );
  }

  const marked = bookmarks.includes(current);
  const submitGoto = () => {
    const n = Number.parseInt(gotoText, 10);
    if (Number.isFinite(n) && n >= 1 && n <= st.pageCount) {
      goTo(n);
      setPanel(null);
      setGotoText('');
    }
  };
  const togglePanel = (p: 'goto' | 'bookmarks') => setPanel(v => (v === p ? null : p));

  const Action = ({label, active, onPress, testID}: {label: string; active?: boolean; onPress: () => void; testID: string}) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{selected: !!active}}
      testID={testID}
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 44,
        borderRadius: radii.md,
        paddingHorizontal: spacing.sm,
        backgroundColor: active ? withAlpha(colors.goldPrestige, 0.18) : 'transparent',
      }}>
      <Text variant="bodySmallStrong" color={active ? 'primary' : 'secondary'} numberOfLines={2} style={{fontSize: 13, textAlign: 'center'}}>
        {label}
      </Text>
    </Pressable>
  );
  const panelStyle = {
    backgroundColor: colors.bgSurface,
    borderColor: colors.borderLight,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.md,
  };
  const sep = <View style={{width: 1, alignSelf: 'stretch', backgroundColor: colors.borderLight, marginVertical: 6}} />;

  return (
    <View style={{flex: 1, backgroundColor: colors.bgApp}} testID="screen-pdf-reader">
      <ScrollView
        horizontal
        bounces={false}
        showsHorizontalScrollIndicator={zoom > ZOOM_MIN}
        contentContainerStyle={{width: pageWidth}}
        style={{flex: 1}}>
        <FlatList
          ref={listRef}
          data={Array.from({length: st.pageCount}, (_, i) => i)}
          keyExtractor={i => String(i)}
          renderItem={renderItem}
          style={{width: pageWidth}}
          getItemLayout={(_, i) => ({length: pageHeight, offset: pageHeight * i, index: i})}
          initialScrollIndex={st.startPage}
          initialNumToRender={2}
          windowSize={5}
          maxToRenderPerBatch={2}
          removeClippedSubviews
          onViewableItemsChanged={onViewable}
          viewabilityConfig={{itemVisiblePercentThreshold: 50}}
          onScrollToIndexFailed={info => {
            setTimeout(() => listRef.current?.scrollToOffset({offset: pageHeight * info.index, animated: false}), 100);
          }}
          testID="pdf-list"
        />
      </ScrollView>

      <View style={{gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md + insets.bottom, paddingTop: spacing.sm}}>
        {panel === 'goto' ? (
          <View style={[panelStyle, {flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md}]}>
            <View style={{flex: 1}}>
              <TextField
                label={t('app.reader.pageNumber')}
                value={gotoText}
                onChangeText={setGotoText}
                keyboardType="number-pad"
                placeholder={`1 – ${st.pageCount}`}
                testID="pdf-goto-input"
              />
            </View>
            <Button label={t('app.reader.goTo')} onPress={submitGoto} testID="pdf-goto-submit" />
          </View>
        ) : null}
        {panel === 'bookmarks' ? (
          <View style={[panelStyle, {gap: spacing.sm}]}>
            {bookmarks.length === 0 ? (
              <Text variant="bodySmall" color="muted">
                {t('app.reader.bookmarksEmpty')}
              </Text>
            ) : (
              bookmarks.map(p => (
                <View key={p} style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md}}>
                  <Button
                    label={t('app.reader.bookmarkPage', {page: p})}
                    variant="secondary"
                    onPress={() => {
                      goTo(p);
                      setPanel(null);
                    }}
                    testID={`pdf-bookmark-${p}`}
                  />
                  <Button
                    label={t('app.reader.bookmarkRemove')}
                    variant="ghost"
                    onPress={() => void bookmarksStore.toggle(id, p).then(setBookmarks)}
                    testID={`pdf-bookmark-remove-${p}`}
                  />
                </View>
              ))
            )}
          </View>
        ) : null}

        <View
          style={{
            backgroundColor: colors.bgSurface,
            borderColor: colors.goldBorder,
            borderRadius: radii.lg,
            borderWidth: 1,
            gap: spacing.xs,
            padding: spacing.sm,
          }}
          testID="pdf-toolbar">
          <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xs}}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: spacing.xs}}>
              <Button
                label="−"
                accessibilityLabel={t('app.reader.zoomOut')}
                variant="secondary"
                disabled={zoom <= ZOOM_MIN}
                onPress={() => setZoom(z => Math.max(ZOOM_MIN, z - ZOOM_STEP))}
                testID="pdf-zoom-out"
              />
              <Pressable
                onPress={() => setZoom(ZOOM_MIN)}
                accessibilityRole="button"
                accessibilityLabel={t('app.reader.zoomReset')}
                testID="pdf-zoom-reset"
                style={{minWidth: 56, alignItems: 'center'}}>
                <Text variant="bodySmallStrong" accessibilityLabel={t('app.reader.zoomValue', {percent: Math.round(zoom * 100)})}>
                  {Math.round(zoom * 100)} %
                </Text>
              </Pressable>
              <Button
                label="+"
                accessibilityLabel={t('app.reader.zoomIn')}
                variant="secondary"
                disabled={zoom >= ZOOM_MAX}
                onPress={() => setZoom(z => Math.min(ZOOM_MAX, z + ZOOM_STEP))}
                testID="pdf-zoom-in"
              />
            </View>
            <Text variant="bodySmallStrong" color="secondary">
              {t('app.reader.pageOf', {current, total: st.pageCount})}
            </Text>
          </View>
          <View style={{height: 1, backgroundColor: colors.borderLight}} />
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Action label={t('app.reader.goToPage')} active={panel === 'goto'} onPress={() => togglePanel('goto')} testID="pdf-goto" />
            {sep}
            <Action
              label={marked ? t('app.reader.bookmarkRemove') : t('app.reader.bookmarkAdd')}
              active={marked}
              onPress={() => void bookmarksStore.toggle(id, current).then(setBookmarks)}
              testID="pdf-bookmark-toggle"
            />
            {sep}
            <Action
              label={`${t('app.reader.bookmarks')} (${bookmarks.length})`}
              active={panel === 'bookmarks'}
              onPress={() => togglePanel('bookmarks')}
              testID="pdf-bookmarks"
            />
          </View>
        </View>
      </View>
    </View>
  );
}
