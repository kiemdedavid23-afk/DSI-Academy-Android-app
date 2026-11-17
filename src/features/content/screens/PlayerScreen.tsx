/**
 * Lecteur audio / vidéo (Media3) et YouTube intégré. Écran sans logique réseau : tout passe par playerStore.
 * Site : AudioPlayer.jsx / VideoPlayer.jsx — vitesse 0,5 à 2×, boucle, volume et muet, minuteur de sommeil,
 * image dans l'image, double-tap ±15 s et appui long 2× sur la vidéo.
 */

import React, {useEffect, useRef, useState, useSyncExternalStore} from 'react';
import {
  AppState,
  PermissionsAndroid,
  Platform,
  Pressable,
  StyleSheet,
  View,
  requireNativeComponent,
  type ViewProps,
} from 'react-native';
import {WebView} from 'react-native-webview';
import {readerErrorKey} from '@core/utils/readerFailure';
import {ErrorState, mediaStageColors, Text, useTheme, withAlpha} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {BufferOverlay, LoadProgress} from '../components/LoadProgress';
import {loadTrace} from '@core/media/loadTrace';
import {AudioStage} from '../components/AudioStage';
import {ReaderFrame} from '../components/ReaderFrame';
import {VideoStage} from '../components/VideoStage';
import {isAllowedYoutubeNavigation, playerStore, YOUTUBE_BASE_URL, YOUTUBE_ORIGIN_WHITELIST} from '../store/playerStore';

const NativeVideo = requireNativeComponent<ViewProps>('DsiVideoView');

export type PlayerScreenProps = {id: number; title: string; thumbnailUrl: string | null; onBack: () => void};

const TAP_WINDOW_MS = 300;
const HOLD_MS = 400;
const HOLD_SPEED = 2;
const HINT_MS = 700;
const SKIP_MS = 10_000;

/**
 * Gestes sur la vidéo : un appui = lecture / pause, double appui à gauche ou à droite = ∓15 s,
 * appui long = 2× tant que le doigt reste posé.
 */
function VideoGestures({enabled, onSingleTap}: {enabled: boolean; onSingleTap: () => void}) {
  const {t} = useTranslation();
  const {spacing, colors, radii} = useTheme();
  const lastTap = useRef<{side: 'left' | 'right'; at: number} | null>(null);
  const singleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevSpeed = useRef<number | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const flash = (text: string) => {
    setHint(text);
    if (hintTimer.current) {
      clearTimeout(hintTimer.current);
    }
    hintTimer.current = setTimeout(() => setHint(null), HINT_MS);
  };

  const cancelSingle = () => {
    if (singleTimer.current) {
      clearTimeout(singleTimer.current);
      singleTimer.current = null;
    }
  };

  useEffect(
    () => () => {
      cancelSingle();
      if (hintTimer.current) {
        clearTimeout(hintTimer.current);
      }
      if (prevSpeed.current !== null) {
        playerStore.setSpeed(prevSpeed.current);
      }
    },
    [],
  );

  const tap = (side: 'left' | 'right') => {
    const now = Date.now();
    const last = lastTap.current;
    if (last && last.side === side && now - last.at < TAP_WINDOW_MS) {
      cancelSingle();
      lastTap.current = null;
      if (side === 'left') {
        playerStore.seekBy(-SKIP_MS);
        flash('−10 s');
      } else {
        playerStore.seekBy(SKIP_MS);
        flash('+10 s');
      }
      return;
    }
    lastTap.current = {side, at: now};
    cancelSingle();
    singleTimer.current = setTimeout(() => {
      lastTap.current = null;
      singleTimer.current = null;
      onSingleTap();
    }, TAP_WINDOW_MS);
  };

  const holdStart = () => {
    cancelSingle();
    lastTap.current = null;
    if (prevSpeed.current === null) {
      prevSpeed.current = playerStore.getState().speed;
      playerStore.setSpeed(HOLD_SPEED);
      flash(t('app.player.hold2x'));
    }
  };

  const holdEnd = () => {
    if (prevSpeed.current !== null) {
      playerStore.setSpeed(prevSpeed.current);
      prevSpeed.current = null;
    }
  };

  const zone = (side: 'left' | 'right') => (
    <Pressable
      accessible={false}
      style={{flex: 1}}
      delayLongPress={HOLD_MS}
      onPress={() => tap(side)}
      onLongPress={holdStart}
      onPressOut={holdEnd}
      testID={`video-zone-${side}`}
    />
  );

  if (!enabled) {
    return <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={onSingleTap} testID="video-locked-zone" />;
  }

  return (
    <View style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row'}}>
      {zone('left')}
      {zone('right')}
      {hint ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            alignSelf: 'center',
            top: '40%',
            backgroundColor: withAlpha(colors.bgDarkPremium, 0.7),
            borderRadius: radii.pill,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.sm,
          }}>
          <Text variant="bodyStrong" color="onDark">
            {hint}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export function PlayerScreen({id, title, thumbnailUrl, onBack}: PlayerScreenProps) {
  const {t} = useTranslation();
  const {spacing} = useTheme();
  const st = useSyncExternalStore(playerStore.subscribe, playerStore.getState);
  const trace = useSyncExternalStore(loadTrace.subscribe, loadTrace.get);
  const initialBuffer = trace.currentId === 'buffer';
  const overlay =
    initialBuffer || st.buffering ? (
      <BufferOverlay percent={initialBuffer ? trace.progress : st.bufferedPercent} />
    ) : null;

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
      const cur = playerStore.getState();
      if (s === 'active') {
        if (cur.pip) {
          playerStore.setPip(false);
        }
        return;
      }
      // L'image dans l'image garde la lecture ; sinon la vidéo se met en pause hors de l'app.
      if (cur.kind === 'video' && !cur.pip) {
        playerStore.pause();
      }
    });
    return () => sub.remove();
  }, []);

  const frame = (node: React.ReactNode) => (
    <ReaderFrame title={title} onBack={onBack}>
      {node}
    </ReaderFrame>
  );

  if (st.status === 'loading' || st.status === 'idle') {
    return frame(<LoadProgress thumbnailUrl={thumbnailUrl} />);
  }
  if (st.status === 'error') {
    return frame(
      <ErrorState
        message={t(readerErrorKey(st.errorKind))}
        retryLabel={st.retryable ? t('common.retry') : undefined}
        onRetry={st.retryable ? () => void playerStore.open(id, title, thumbnailUrl) : undefined}
        testID="player-error"
      />,
    );
  }

  if (st.kind === 'youtube' && st.youtubeHtml) {
    return frame(
      <View style={{flex: 1, backgroundColor: mediaStageColors.background}} testID="screen-youtube">
        <View style={{width: '100%', aspectRatio: 16 / 9}}>
          <WebView
            source={{html: st.youtubeHtml, baseUrl: YOUTUBE_BASE_URL}}
            originWhitelist={YOUTUBE_ORIGIN_WHITELIST}
            onShouldStartLoadWithRequest={r => isAllowedYoutubeNavigation(r.url)}
            allowsFullscreenVideo
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
          />
        </View>
        <Text variant="subtitle" style={{color: mediaStageColors.text, padding: spacing.xl}}>
          {st.title}
        </Text>
      </View>,
    );
  }

  // Fenêtre d'image dans l'image : la vidéo seule, sans commandes.
  if (st.kind === 'video' && st.pip) {
    return (
      <View style={{flex: 1, backgroundColor: mediaStageColors.background}} testID="screen-video-pip">
        <NativeVideo style={{flex: 1}} />
      </View>
    );
  }

  if (st.kind === 'video') {
    return (
      <View style={{flex: 1}}>
        <VideoStage
          title={st.title}
          fullscreen={st.fullscreen}
          playing={st.playing}
          positionMs={st.positionMs}
          durationMs={st.durationMs}
          speed={st.speed}
          video={<NativeVideo style={{flex: 1}} />}
          gestures={g => <VideoGestures enabled={g.enabled} onSingleTap={g.onSingleTap} />}
          onBack={onBack}
        />
        {overlay}
      </View>
    );
  }

  return (
    <View style={{flex: 1}}>
      <AudioStage
        title={st.title}
        thumbnailUrl={thumbnailUrl}
        playing={st.playing}
        positionMs={st.positionMs}
        durationMs={st.durationMs}
        speed={st.speed}
        loop={st.loop}
        muted={st.muted}
        sleepMinutes={st.sleepMinutes}
        buffering={st.buffering}
        onBack={onBack}
      />
      {overlay}
    </View>
  );
}
