/** Lecteur EPUB / MOBI / DOCX natif : texte et titres, taille réglable, progression et reprise. */

import React, {useEffect, useRef, useSyncExternalStore} from 'react';
import {FlatList, View} from 'react-native';

type ViewToken = {index?: number | null};
import type {DocBlock, DocErrorKind} from '@core/media/docNative';
import {readerErrorKey} from '@core/utils/readerFailure';
import {ErrorState, LoadingState, readingThemes, Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {ReadingSettings} from '../components/ReadingSettings';
import {docReaderStore} from '../store/docReaderStore';
import {readerLookStore} from '../store/readerLookStore';

const BASE = 17;

export function docErrorKey(kind: DocErrorKind | null): string {
  if (kind === 'docInvalid') {
    return 'app.reader.docInvalid';
  }
  if (kind === 'docEncrypted') {
    return 'app.reader.docEncrypted';
  }
  if (kind === 'docUnsupportedMobi') {
    return 'app.reader.docUnsupportedMobi';
  }
  if (kind === 'pdfProtected' || kind === 'pdfInvalid') {
    return 'app.reader.docInvalid';
  }
  return readerErrorKey(kind);
}

export function DocReaderScreen({id, title}: {id: number; title: string}) {
  const {t} = useTranslation();
  const {spacing} = useTheme();
  const st = useSyncExternalStore(docReaderStore.subscribe, docReaderStore.getState);
  const look = useSyncExternalStore(readerLookStore.subscribe, readerLookStore.getState);
  const palette = readingThemes[look.theme];
  const listRef = useRef<FlatList<DocBlock>>(null);
  const resumed = useRef(false);

  useEffect(() => {
    void readerLookStore.load();
  }, []);

  useEffect(() => {
    resumed.current = false;
    void docReaderStore.open(id, title);
    return () => {
      void docReaderStore.close(id);
    };
  }, [id, title]);

  const onViewable = useRef(({viewableItems}: {viewableItems: ViewToken[]}) => {
    const first = viewableItems[0]?.index;
    if (typeof first === 'number') {
      docReaderStore.reportIndex(first);
    }
  }).current;

  useEffect(() => {
    if (st.status === 'ready' && st.startIndex > 0 && !resumed.current) {
      resumed.current = true;
      setTimeout(() => listRef.current?.scrollToIndex({index: st.startIndex, animated: false}), 50);
    }
  }, [st.status, st.startIndex]);

  if (st.status === 'loading' || st.status === 'idle') {
    return <LoadingState fill accessibilityLabel={t('content.loading')} />;
  }
  if (st.status === 'error') {
    return (
      <ErrorState
        message={t(docErrorKey(st.errorKind))}
        retryLabel={st.retryable ? t('common.retry') : undefined}
        onRetry={st.retryable ? () => void docReaderStore.open(id, title) : undefined}
        testID="reader-error"
      />
    );
  }

  const size = Math.round((BASE * look.fontPercent) / 100);
  const bodyVariant = look.family === 'serif' ? 'readingSerif' : 'readingSans';
  return (
    <View style={{flex: 1, backgroundColor: palette.background}} testID="screen-doc-reader">
      <ReadingSettings />
      <FlatList
        ref={listRef}
        data={st.blocks}
        keyExtractor={(_, i) => String(i)}
        renderItem={({item}) =>
          item.k === 'h' ? (
            <Text variant="title" selectable style={{color: palette.text, fontSize: Math.round(size * (item.l === 1 ? 1.5 : item.l === 2 ? 1.3 : 1.15)), marginTop: spacing.lg}}>
              {item.x}
            </Text>
          ) : (
            <Text variant={bodyVariant} selectable style={{color: palette.text, fontSize: size, lineHeight: size * 1.55}}>{item.x}</Text>
          )
        }
        contentContainerStyle={{padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxxl}}
        onScrollToIndexFailed={info => {
          setTimeout(() => listRef.current?.scrollToOffset({offset: info.averageItemLength * info.index, animated: false}), 100);
        }}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={{itemVisiblePercentThreshold: 30}}
        initialNumToRender={12}
        windowSize={9}
        testID="doc-list"
      />
    </View>
  );
}
