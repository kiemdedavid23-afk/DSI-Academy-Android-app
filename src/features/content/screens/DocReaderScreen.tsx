/** Lecteur EPUB / MOBI / DOCX natif : texte et titres, taille réglable, progression et reprise. */

import React, {useEffect, useRef, useState, useSyncExternalStore} from 'react';
import {FlatList, View} from 'react-native';

type ViewToken = {index?: number | null};
import type {DocBlock, DocErrorKind} from '@core/media/docNative';
import {readerErrorKey} from '@core/utils/readerFailure';
import {Button, ErrorState, LoadingState, Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {docReaderStore} from '../store/docReaderStore';
import {FONT_SCALES} from '../store/textReaderStore';

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
  const {colors, spacing} = useTheme();
  const st = useSyncExternalStore(docReaderStore.subscribe, docReaderStore.getState);
  const [scale, setScale] = useState(1);
  const listRef = useRef<FlatList<DocBlock>>(null);
  const resumed = useRef(false);

  useEffect(() => {
    resumed.current = false;
    void docReaderStore.open(id, title);
    return () => {
      void docReaderStore.close();
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

  const size = BASE * scale;
  const idx = FONT_SCALES.indexOf(scale as (typeof FONT_SCALES)[number]);
  return (
    <View style={{flex: 1, backgroundColor: colors.bgApp}} testID="screen-doc-reader">
      <View style={{flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm}}>
        <Button label={t('app.reader.smaller')} variant="secondary" disabled={idx <= 0} onPress={() => setScale(FONT_SCALES[Math.max(0, idx - 1)])} />
        <Button label={t('app.reader.larger')} variant="secondary" disabled={idx >= FONT_SCALES.length - 1} onPress={() => setScale(FONT_SCALES[Math.min(FONT_SCALES.length - 1, idx + 1)])} />
      </View>
      <FlatList
        ref={listRef}
        data={st.blocks}
        keyExtractor={(_, i) => String(i)}
        renderItem={({item}) =>
          item.k === 'h' ? (
            <Text variant="title" selectable style={{fontSize: size * (item.l === 1 ? 1.5 : item.l === 2 ? 1.3 : 1.15), marginTop: spacing.lg}}>
              {item.x}
            </Text>
          ) : (
            <Text selectable style={{fontSize: size, lineHeight: size * 1.55}}>{item.x}</Text>
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
