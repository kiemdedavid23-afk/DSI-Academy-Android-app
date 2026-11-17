/**
 * Lecteur de texte brut (site : TxtViewer.jsx). Défilement continu, taille du
 * texte, progression et reprise locales. PDF, EPUB et autres formats : lots suivants.
 */

import React, {useCallback, useEffect, useRef, useSyncExternalStore} from 'react';
import {FlatList, View, type NativeScrollEvent, type NativeSyntheticEvent} from 'react-native';
import {readerErrorKey} from '@core/utils/readerFailure';
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  readingThemes,
  Text,
  useTheme,
} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {isDocFormat} from '@core/media/docNative';
import {DocReaderScreen} from './DocReaderScreen';
import {PdfReaderScreen} from './PdfReaderScreen';
import {ReadingSettings} from '../components/ReadingSettings';
import {readerLookStore} from '../store/readerLookStore';
import {textReaderStore} from '../store/textReaderStore';

export type TextReaderScreenProps = {id: number; title: string};

const BASE_SIZE = 17;
const LINE_RATIO = 1.65;

export function TextReaderScreen({id, title}: TextReaderScreenProps) {
  const {t} = useTranslation();
  const {colors, spacing, radii} = useTheme();
  const st = useSyncExternalStore(
    textReaderStore.subscribe,
    textReaderStore.getState,
  );
  const look = useSyncExternalStore(
    readerLookStore.subscribe,
    readerLookStore.getState,
  );
  const palette = readingThemes[look.theme];
  const listRef = useRef<FlatList<string>>(null);
  const sizes = useRef({content: 0, layout: 0});
  const resumed = useRef(false);

  useEffect(() => {
    void readerLookStore.load();
  }, []);

  useEffect(() => {
    resumed.current = false;
    void textReaderStore.open(id, title);
    return () => {
      void textReaderStore.close(id);
    };
  }, [id, title]);

  const percentAt = (y: number): number => {
    const max = sizes.current.content - sizes.current.layout;
    return max > 0 ? Math.max(0, Math.min(100, (y / max) * 100)) : 0;
  };

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    textReaderStore.reportProgress(percentAt(e.nativeEvent.contentOffset.y));
  }, []);

  // Reprise : une seule fois, quand la hauteur totale est connue.
  const tryResume = () => {
    const {resumePercent} = textReaderStore.getState();
    const max = sizes.current.content - sizes.current.layout;
    if (resumed.current || resumePercent === null || max <= 0) {
      return;
    }
    resumed.current = true;
    listRef.current?.scrollToOffset({
      offset: (resumePercent / 100) * max,
      animated: false,
    });
  };

  if (st.status === 'loading' || st.status === 'idle') {
    return <LoadingState fill accessibilityLabel={t('content.loading')} />;
  }
  if (st.status === 'unsupported' && st.format?.toLowerCase() === 'pdf') {
    return <PdfReaderScreen id={id} title={title} />;
  }
  if (st.status === 'unsupported' && isDocFormat(st.format)) {
    return <DocReaderScreen id={id} title={title} />;
  }
  if (st.status === 'unsupported') {
    return (
      <EmptyState
        message={t('app.reader.formatSoon')}
        testID="reader-unsupported"
      />
    );
  }
  if (st.status === 'error') {
    return (
      <ErrorState
        message={t(readerErrorKey(st.errorKind))}
        retryLabel={st.retryable ? t('common.retry') : undefined}
        onRetry={st.retryable ? () => void textReaderStore.open(id, title) : undefined}
        testID="reader-error"
      />
    );
  }

  const size = Math.round((BASE_SIZE * look.fontPercent) / 100);

  return (
    <View style={{flex: 1, backgroundColor: palette.background}} testID="screen-text-reader">
      <ReadingSettings />

      {st.resumePercent !== null ? (
        <View
          accessibilityRole="alert"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing.md,
            marginHorizontal: spacing.xl,
            marginBottom: spacing.sm,
            padding: spacing.md,
            borderRadius: radii.md,
            backgroundColor: colors.goldLight,
            borderWidth: 1,
            borderColor: colors.goldBorder,
          }}>
          <Text variant="bodySmall" style={{flex: 1}}>
            {t('app.reader.resumed', {percent: st.resumePercent})}
          </Text>
          <Button
            label={t('app.reader.startOver')}
            variant="ghost"
            onPress={() => {
              textReaderStore.dismissResume();
              listRef.current?.scrollToOffset({offset: 0, animated: false});
            }}
            testID="reader-start-over"
          />
        </View>
      ) : null}

      <FlatList
        ref={listRef}
        data={st.chunks}
        keyExtractor={(_, i) => String(i)}
        renderItem={({item}) => (
          <Text
            variant={look.family === 'serif' ? 'readingSerif' : 'readingSans'}
            selectable
            style={{color: palette.text, fontSize: size, lineHeight: size * LINE_RATIO}}>
            {item}
          </Text>
        )}
        contentContainerStyle={{
          padding: spacing.xl,
          gap: spacing.lg,
          paddingBottom: spacing.xxxl,
        }}
        onScroll={onScroll}
        scrollEventThrottle={100}
        onContentSizeChange={(_, h) => {
          sizes.current.content = h;
          tryResume();
        }}
        onLayout={e => {
          sizes.current.layout = e.nativeEvent.layout.height;
          tryResume();
        }}
        initialNumToRender={6}
        windowSize={9}
        testID="reader-list"
      />
    </View>
  );
}
