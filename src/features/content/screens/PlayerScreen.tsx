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
  ScrollView,
  View,
  requireNativeComponent,
  type ViewProps,
} from 'react-native';
import {WebView} from 'react-native-webview';
import {formatClock, SLEEP_OPTIONS, SPEED_OPTIONS} from '@core/media/playerNative';
import {readerErrorKey} from '@core/utils/readerFailure';
import {Button, ErrorState, LoadingState, mediaStageColors, Text, useTheme, withAlpha} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {ContentCover} from '../components/ContentCover';
import {ReaderChip} from '../components/ReaderChip';
import {isAllowedYoutubeNavigation, playerStore, YOUTUBE_BASE_URL, YOUTUBE_ORIGIN_WHITELIST} from '../store/playerStore';

const NativeVideo = requireNativeComponent<ViewProps>('DsiVideoView');

export type PlayerScreenProps = {id: number; title: string; thumbnailUrl: string | null};

const TAP_WINDOW_MS = 300;
const HOLD_MS = 400;
const HOLD_SPEED = 2;
const HINT_MS = 700;
/** Bande basse laissée libre pour la barre native de la vidéo. */
const BOTTOM_FREE = 56;
const PIP_MIN_API = 26;

function ProgressBar({
  fraction,
  onSeek,
  testID = 'player-progress',
  label,
}: {
  fraction: number;
  onSeek: (f: number) => void;
  testID?: string;
  label?: string;
}) {
  const {colors} = useTheme();
  const [w, setW] = useState(1);
  return (
    <Pressable
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{min: 0, max: 100, now: Math.round(fraction * 100)}}
      onLayout={e => setW(Math.max(1, e.nativeEvent.layout.width))}
      onPress={e => onSeek(e.nativeEvent.locationX / w)}
      style={{height: 28, justifyContent: 'center'}}
      testID={testID}>
      <View style={{height: 6, borderRadius: 3, backgroundColor: colors.borderLight}}>
        <View style={{width: `${Math.round(fraction * 100)}%`, height: 6, borderRadius: 3, backgroundColor: colors.goldBorder}} />
      </View>
    </Pressable>
  );
}

/**
 * Gestes sur la vidéo : un appui = lecture / pause, double appui à gauche ou à droite = ∓15 s,
 * appui long = 2× tant que le doigt reste posé.
 */
function VideoGestures() {
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
        playerStore.seekBack();
        flash(t('app.player.back15'));
      } else {
        playerStore.seekForward();
        flash(t('app.player.forward15'));
      }
      return;
    }
    lastTap.current = {side, at: now};
    cancelSingle();
    singleTimer.current = setTimeout(() => {
      lastTap.current = null;
      singleTimer.current = null;
      playerStore.togglePlay();
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

  return (
    <View style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: BOTTOM_FREE, flexDirection: 'row'}}>
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

export function PlayerScreen({id, title, thumbnailUrl}: PlayerScreenProps) {
  const {t} = useTranslation();
  const {colors, spacing} = useTheme();
  const st = useSyncExternalStore(playerStore.subscribe, playerStore.getState);
  const [sleepOpen, setSleepOpen] = useState(false);
  const pipAvailable = Platform.OS === 'android' && Number(Platform.Version) >= PIP_MIN_API;

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
      </View>
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

  const fraction = st.durationMs > 0 ? st.positionMs / st.durationMs : 0;
  const controls = (
    <View style={{gap: spacing.md, padding: spacing.xl}}>
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

      <View style={{gap: spacing.sm}}>
        <Text variant="captionStrong" color="secondary" style={{textTransform: 'uppercase'}}>
          {t('app.player.speedLabel')}
        </Text>
        <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm}} testID="player-speed">
          {SPEED_OPTIONS.map(s => (
            <ReaderChip
              key={s}
              label={`${s}×`}
              active={st.speed === s}
              onPress={() => playerStore.setSpeed(s)}
              testID={`player-speed-${s}`}
            />
          ))}
        </View>
      </View>

      <View style={{gap: spacing.sm}}>
        <Text variant="captionStrong" color="secondary" style={{textTransform: 'uppercase'}}>
          {t('app.player.volume')}
        </Text>
        <ProgressBar
          fraction={st.muted ? 0 : st.volume}
          onSeek={playerStore.setVolume}
          testID="player-volume"
          label={t('app.player.volume')}
        />
      </View>

      <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm}}>
        <ReaderChip label={t('app.player.loop')} active={st.loop} onPress={playerStore.toggleLoop} testID="player-loop" />
        <ReaderChip
          label={st.muted ? t('app.player.unmute') : t('app.player.mute')}
          active={st.muted}
          onPress={playerStore.toggleMute}
          testID="player-mute"
        />
        <ReaderChip
          label={st.sleepMinutes !== null ? t('app.player.sleepActive', {minutes: st.sleepMinutes}) : t('app.player.sleep')}
          active={st.sleepMinutes !== null || sleepOpen}
          onPress={() => setSleepOpen(v => !v)}
          testID="player-sleep"
        />
        {st.kind === 'video' ? (
          <ReaderChip
            label={st.fullscreen ? t('app.player.exitFullscreen') : t('app.player.fullscreen')}
            onPress={() => playerStore.setFullscreen(!st.fullscreen)}
            testID="player-fullscreen"
          />
        ) : null}
        {st.kind === 'video' && pipAvailable ? (
          <ReaderChip label={t('app.player.pip')} onPress={playerStore.enterPip} testID="player-pip" />
        ) : null}
      </View>

      {sleepOpen ? (
        <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm}} testID="player-sleep-options">
          <ReaderChip
            label={t('app.player.sleepOff')}
            active={st.sleepMinutes === null}
            onPress={() => {
              playerStore.setSleep(null);
              setSleepOpen(false);
            }}
            testID="player-sleep-off"
          />
          {SLEEP_OPTIONS.map(m => (
            <ReaderChip
              key={m}
              label={t('app.player.sleepMinutes', {minutes: m})}
              active={st.sleepMinutes === m}
              onPress={() => {
                playerStore.setSleep(m);
                setSleepOpen(false);
              }}
              testID={`player-sleep-${m}`}
            />
          ))}
        </View>
      ) : null}
      {st.buffering ? <Text variant="bodySmall" color="muted" style={{textAlign: 'center'}}>{t('app.player.buffering')}</Text> : null}
    </View>
  );

  if (st.kind === 'video') {
    return (
      <View style={{flex: 1, backgroundColor: st.fullscreen ? mediaStageColors.background : colors.bgApp}} testID="screen-video">
        <View style={st.fullscreen ? {flex: 1} : {width: '100%', aspectRatio: 16 / 9, backgroundColor: mediaStageColors.background}}>
          <NativeVideo style={{flex: 1}} />
          <VideoGestures />
        </View>
        {st.fullscreen ? null : (
          <ScrollView style={{flex: 1}} contentContainerStyle={{paddingBottom: spacing.xxxl}}>
            <Text variant="heading" style={{paddingHorizontal: spacing.xl, paddingTop: spacing.lg}}>{st.title}</Text>
            {controls}
          </ScrollView>
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
    <ScrollView
      style={{flex: 1, backgroundColor: colors.bgApp}}
      contentContainerStyle={{paddingBottom: spacing.xxxl}}
      testID="screen-audio">
      <View style={{width: '60%', alignSelf: 'center', marginTop: spacing.xl}}>
        <ContentCover thumbnailUrl={thumbnailUrl} houseId="audio" />
      </View>
      <Text variant="heading" style={{textAlign: 'center', padding: spacing.xl}}>{st.title}</Text>
      {controls}
    </ScrollView>
  );
}
