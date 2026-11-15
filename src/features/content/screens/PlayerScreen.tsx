/** Lecteur audio / vidéo (Media3) et YouTube intégré. Écran sans logique réseau : tout passe par playerStore. */

import React, {useEffect, useState, useSyncExternalStore} from 'react';
import {
  AppState,
  PermissionsAndroid,
  Platform,
  Pressable,
  View,
  requireNativeComponent,
  type ViewProps,
} from 'react-native';
import {WebView} from 'react-native-webview';
import {formatClock} from '@core/media/playerNative';
import {readerErrorKey} from '@core/utils/readerFailure';
import {Button, ErrorState, LoadingState, Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {ContentCover} from '../components/ContentCover';
import {isAllowedYoutubeNavigation, playerStore, YOUTUBE_BASE_URL} from '../store/playerStore';

const NativeVideo = requireNativeComponent<ViewProps>('DsiVideoView');

export type PlayerScreenProps = {id: number; title: string; thumbnailUrl: string | null};

function ProgressBar({fraction, onSeek}: {fraction: number; onSeek: (f: number) => void}) {
  const {colors} = useTheme();
  const [w, setW] = useState(1);
  return (
    <Pressable
      accessibilityRole="adjustable"
      onLayout={e => setW(Math.max(1, e.nativeEvent.layout.width))}
      onPress={e => onSeek(e.nativeEvent.locationX / w)}
      style={{height: 28, justifyContent: 'center'}}
      testID="player-progress">
      <View style={{height: 6, borderRadius: 3, backgroundColor: colors.borderLight}}>
        <View style={{width: `${Math.round(fraction * 100)}%`, height: 6, borderRadius: 3, backgroundColor: colors.goldBorder}} />
      </View>
    </Pressable>
  );
}

export function PlayerScreen({id, title, thumbnailUrl}: PlayerScreenProps) {
  const {t} = useTranslation();
  const {colors, spacing} = useTheme();
  const st = useSyncExternalStore(playerStore.subscribe, playerStore.getState);

  useEffect(() => {
    if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
      void PermissionsAndroid.request('android.permission.POST_NOTIFICATIONS');
    }
    void playerStore.open(id, title, thumbnailUrl);
    return () => {
      void playerStore.close();
    };
  }, [id, title, thumbnailUrl]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', s => {
      if (s !== 'active' && playerStore.getState().kind === 'video') {
        playerStore.pause();
      }
    });
    return () => sub.remove();
  }, []);

  if (st.status === 'loading' || st.status === 'idle') {
    return <LoadingState fill accessibilityLabel={t('content.loading')} />;
  }
  if (st.status === 'error') {
    return (
      <ErrorState
        message={t(readerErrorKey(st.errorKind))}
        retryLabel={st.retryable ? t('common.retry') : undefined}
        onRetry={st.retryable ? () => void playerStore.open(id, title, thumbnailUrl) : undefined}
        testID="player-error"
      />
    );
  }

  if (st.kind === 'youtube' && st.youtubeHtml) {
    return (
      <View style={{flex: 1, backgroundColor: '#000'}} testID="screen-youtube">
        <View style={{width: '100%', aspectRatio: 16 / 9}}>
          <WebView
            source={{html: st.youtubeHtml, baseUrl: YOUTUBE_BASE_URL}}
            originWhitelist={['https://*', 'about:blank']}
            onShouldStartLoadWithRequest={r => isAllowedYoutubeNavigation(r.url)}
            allowsFullscreenVideo
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
          />
        </View>
        <Text variant="subtitle" style={{color: '#fff', padding: spacing.xl}}>
          {st.title}
        </Text>
      </View>
    );
  }

  const fraction = st.durationMs > 0 ? st.positionMs / st.durationMs : 0;
  const controls = (
    <View style={{gap: spacing.sm, padding: spacing.xl}}>
      <ProgressBar fraction={fraction} onSeek={playerStore.seekToFraction} />
      <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
        <Text variant="bodySmall" color="muted">{formatClock(st.positionMs)}</Text>
        <Text variant="bodySmall" color="muted">{formatClock(st.durationMs)}</Text>
      </View>
      <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md}}>
        <Button label={t('app.player.back15')} variant="secondary" onPress={playerStore.seekBack} testID="player-back" />
        <Button
          label={st.playing ? t('app.player.pause') : t('app.player.play')}
          onPress={playerStore.togglePlay}
          testID="player-toggle"
        />
        <Button label={t('app.player.forward15')} variant="secondary" onPress={playerStore.seekForward} testID="player-forward" />
      </View>
      <View style={{flexDirection: 'row', justifyContent: 'center', gap: spacing.md}}>
        <Button label={`${st.speed}×`} variant="ghost" onPress={playerStore.cycleSpeed} testID="player-speed" />
        {st.kind === 'video' ? (
          <Button
            label={st.fullscreen ? t('app.player.exitFullscreen') : t('app.player.fullscreen')}
            variant="ghost"
            onPress={() => playerStore.setFullscreen(!st.fullscreen)}
            testID="player-fullscreen"
          />
        ) : null}
      </View>
      {st.buffering ? <Text variant="bodySmall" color="muted" style={{textAlign: 'center'}}>{t('app.player.buffering')}</Text> : null}
    </View>
  );

  if (st.kind === 'video') {
    return (
      <View style={{flex: 1, backgroundColor: st.fullscreen ? '#000' : colors.bgApp}} testID="screen-video">
        <View style={st.fullscreen ? {flex: 1} : {width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000'}}>
          <NativeVideo style={{flex: 1}} />
        </View>
        {st.fullscreen ? null : (
          <>
            <Text variant="heading" style={{paddingHorizontal: spacing.xl, paddingTop: spacing.lg}}>{st.title}</Text>
            {controls}
          </>
        )}
        {st.fullscreen ? (
          <View style={{position: 'absolute', top: spacing.md, right: spacing.md}}>
            <Button label={t('app.player.exitFullscreen')} variant="secondary" onPress={() => playerStore.setFullscreen(false)} />
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={{flex: 1, backgroundColor: colors.bgApp}} testID="screen-audio">
      <View style={{width: '60%', alignSelf: 'center', marginTop: spacing.xl}}>
        <ContentCover thumbnailUrl={thumbnailUrl} />
      </View>
      <Text variant="heading" style={{textAlign: 'center', padding: spacing.xl}}>{st.title}</Text>
      {controls}
    </View>
  );
}
