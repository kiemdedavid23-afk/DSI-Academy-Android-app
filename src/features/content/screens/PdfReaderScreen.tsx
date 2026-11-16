/**
 * Lecteur PDF natif (PdfRenderer, module Kotlin). Défilement vertical page par
 * page, rendu à la demande, reprise à la dernière page lue.
 * Site : PdfViewer.jsx — zoom de 100 % à 300 %, aller à une page, signets.
 * (La table des matières n'existe pas avec PdfRenderer : elle n'est pas proposée.)
 */

import React, {useCallback, useEffect, useRef, useState, useSyncExternalStore} from 'react';
import {FlatList, Image, PixelRatio, ScrollView, View, useWindowDimensions} from 'react-native';
import {renderPdfPage} from '@core/media/pdfNative';
import {readerErrorKey} from '@core/utils/readerFailure';
import {Button, ErrorState, LoadingState, Text, TextField, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {bookmarksStore} from '@shared/store';
import {ReaderChip} from '../components/ReaderChip';
import {pdfReaderStore, type PdfErrorKind} from '../store/pdfReaderStore';

export type PdfReaderScreenProps = {id: number; title: string};

const FIRST_PAGE_RATIO = 1.414;
const ZOOM_MIN = 1;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.25;
/** Au-delà, le rendu devient trop lourd pour la mémoire : l'image est simplement agrandie. */
const MAX_RENDER_PX = 2400;
const BADGE_RADIUS = 16;

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
  const {colors, spacing, radii, glass} = useTheme();
  const {width} = useWindowDimensions();
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

  return (
    <View style={{flex: 1, backgroundColor: colors.bgApp}} testID="screen-pdf-reader">
      <View style={{gap: spacing.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm}}>
        <View style={{flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm}}>
          <Button
            label="−"
            accessibilityLabel={t('app.reader.zoomOut')}
            variant="secondary"
            disabled={zoom <= ZOOM_MIN}
            onPress={() => setZoom(z => Math.max(ZOOM_MIN, z - ZOOM_STEP))}
            testID="pdf-zoom-out"
          />
          <Text variant="bodySmallStrong" accessibilityLabel={t('app.reader.zoomValue', {percent: Math.round(zoom * 100)})}>
            {Math.round(zoom * 100)} %
          </Text>
          <Button
            label="+"
            accessibilityLabel={t('app.reader.zoomIn')}
            variant="secondary"
            disabled={zoom >= ZOOM_MAX}
            onPress={() => setZoom(z => Math.min(ZOOM_MAX, z + ZOOM_STEP))}
            testID="pdf-zoom-in"
          />
          {zoom !== ZOOM_MIN ? (
            <Button label="100 %" accessibilityLabel={t('app.reader.zoomReset')} variant="ghost" onPress={() => setZoom(ZOOM_MIN)} testID="pdf-zoom-reset" />
          ) : null}
        </View>
        <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm}}>
          <ReaderChip label={t('app.reader.goToPage')} active={panel === 'goto'} onPress={() => togglePanel('goto')} testID="pdf-goto" />
          <ReaderChip
            label={marked ? t('app.reader.bookmarkRemove') : t('app.reader.bookmarkAdd')}
            active={marked}
            onPress={() => void bookmarksStore.toggle(id, current).then(setBookmarks)}
            testID="pdf-bookmark-toggle"
          />
          <ReaderChip
            label={`${t('app.reader.bookmarks')} (${bookmarks.length})`}
            active={panel === 'bookmarks'}
            onPress={() => togglePanel('bookmarks')}
            testID="pdf-bookmarks"
          />
        </View>
        {panel === 'goto' ? (
          <View
            style={{
              backgroundColor: glass.bg,
              borderColor: glass.border,
              borderRadius: radii.lg,
              borderWidth: 1,
              flexDirection: 'row',
              alignItems: 'flex-end',
              gap: spacing.md,
              padding: spacing.md,
            }}>
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
          <View
            style={{
              backgroundColor: glass.bg,
              borderColor: glass.border,
              borderRadius: radii.lg,
              borderWidth: 1,
              gap: spacing.sm,
              padding: spacing.md,
            }}>
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
      </View>

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
      <View
        pointerEvents="none"
        style={{position: 'absolute', bottom: spacing.lg, alignSelf: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: BADGE_RADIUS, backgroundColor: colors.bgApp, opacity: 0.9}}>
        <Text variant="bodySmall">{t('app.reader.pageOf', {current, total: st.pageCount})}</Text>
      </View>
    </View>
  );
}
