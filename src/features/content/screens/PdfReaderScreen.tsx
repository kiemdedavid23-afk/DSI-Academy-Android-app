/**
 * Lecteur PDF natif (PdfRenderer, module Kotlin). Défilement vertical page par
 * page, rendu à la demande, reprise à la dernière page lue.
 */

import React, {useCallback, useEffect, useRef, useState, useSyncExternalStore} from 'react';
import {FlatList, Image, PixelRatio, View, useWindowDimensions} from 'react-native';
import {renderPdfPage} from '@core/media/pdfNative';
import {readerErrorKey} from '@core/utils/readerFailure';
import {ErrorState, LoadingState, Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {pdfReaderStore, type PdfErrorKind} from '../store/pdfReaderStore';

export type PdfReaderScreenProps = {id: number; title: string};

const FIRST_PAGE_RATIO = 1.414;

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
    const px = Math.round(PixelRatio.getPixelSizeForLayoutSize(width));
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
  const {colors, spacing} = useTheme();
  const {width} = useWindowDimensions();
  const st = useSyncExternalStore(pdfReaderStore.subscribe, pdfReaderStore.getState);
  const [current, setCurrent] = useState(1);
  const pageHeight = Math.round(width * FIRST_PAGE_RATIO);

  useEffect(() => {
    void pdfReaderStore.open(id, title);
    return () => {
      void pdfReaderStore.close();
    };
  }, [id, title]);

  const onViewable = useRef(({viewableItems}: {viewableItems: ViewToken[]}) => {
    const first = viewableItems[0]?.index;
    if (typeof first === 'number') {
      setCurrent(first + 1);
      pdfReaderStore.reportPage(first);
    }
  }).current;

  const renderItem = useCallback(
    ({index}: {index: number}) =>
      st.handle ? <PdfPage handle={st.handle} index={index} width={width} height={pageHeight} /> : null,
    [st.handle, width, pageHeight],
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

  return (
    <View style={{flex: 1, backgroundColor: colors.bgApp}} testID="screen-pdf-reader">
      <FlatList
        data={Array.from({length: st.pageCount}, (_, i) => i)}
        keyExtractor={i => String(i)}
        renderItem={renderItem}
        getItemLayout={(_, i) => ({length: pageHeight, offset: pageHeight * i, index: i})}
        initialScrollIndex={st.startPage}
        initialNumToRender={2}
        windowSize={5}
        maxToRenderPerBatch={2}
        removeClippedSubviews
        onViewableItemsChanged={onViewable}
        viewabilityConfig={{itemVisiblePercentThreshold: 50}}
        testID="pdf-list"
      />
      <View
        pointerEvents="none"
        style={{position: 'absolute', bottom: spacing.lg, alignSelf: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 16, backgroundColor: colors.bgApp, opacity: 0.9}}>
        <Text variant="bodySmall">{t('app.reader.pageOf', {current, total: st.pageCount})}</Text>
      </View>
    </View>
  );
}
