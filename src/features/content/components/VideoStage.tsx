/**
 * Scène vidéo plein écran noir : vidéo centrée, commandes en surimpression
 * (retour + titre, verrou, ±10 s, lecture/pause, progression, vitesse, plein écran),
 * feuille « Vitesse » et bouton Télécharger verrouillé.
 */

import React, {useEffect, useRef, useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Svg, {Circle, Path, Rect} from 'react-native-svg';
import {SPEED_OPTIONS, formatClock} from '@core/media/playerNative';
import {mediaStageColors, Text, useTheme, withAlpha} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {playerStore} from '../store/playerStore';

const WHITE = mediaStageColors.text;
const BLACK = mediaStageColors.background;
const HIDE_MS = 3500;
const SKIP_MS = 10_000;

type Props = {
  title: string;
  fullscreen: boolean;
  playing: boolean;
  positionMs: number;
  durationMs: number;
  speed: number;
  /** Surface vidéo native + zone de gestes, fournies par l'écran. */
  video: React.ReactNode;
  gestures: (p: {enabled: boolean; onSingleTap: () => void}) => React.ReactNode;
  onBack: () => void;
};

function Skip({dir, onPress}: {dir: 'back' | 'fwd'; onPress: () => void}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={dir === 'back' ? '−10 s' : '+10 s'}
      style={styles.skip}
      testID={dir === 'back' ? 'player-back' : 'player-forward'}>
      <Svg width={48} height={48} viewBox="0 0 48 48" fill="none">
        <Path
          d={dir === 'back' ? 'M24 8a16 16 0 1 1-16 16' : 'M24 8a16 16 0 1 0 16 16'}
          stroke={WHITE}
          strokeWidth={3}
          strokeLinecap="round"
        />
        <Path
          d={dir === 'back' ? 'M18 2l6 6-6 6' : 'M30 2l-6 6 6 6'}
          stroke={WHITE}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
      <Text style={styles.skipText}>10</Text>
    </Pressable>
  );
}

function SeekBar({fraction, onSeek}: {fraction: number; onSeek: (f: number) => void}) {
  const [w, setW] = useState(1);
  const pct = `${Math.round(Math.max(0, Math.min(1, fraction)) * 100)}%` as const;
  return (
    <Pressable
      onLayout={e => setW(Math.max(1, e.nativeEvent.layout.width))}
      onPress={e => onSeek(e.nativeEvent.locationX / w)}
      accessibilityRole="adjustable"
      accessibilityValue={{min: 0, max: 100, now: Math.round(fraction * 100)}}
      style={styles.seek}
      testID="player-progress">
      <View style={[styles.track, {backgroundColor: withAlpha(WHITE, 0.3)}]}>
        <View style={{width: pct, height: '100%', backgroundColor: WHITE, borderRadius: 2}} />
      </View>
      <View style={[styles.thumb, {left: pct, backgroundColor: WHITE}]} />
    </Pressable>
  );
}

export function VideoStage({title, fullscreen, playing, positionMs, durationMs, speed, video, gestures, onBack}: Props) {
  const {t} = useTranslation();
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(true);
  const [locked, setLocked] = useState(false);
  const [unlockHint, setUnlockHint] = useState(false);
  const [sheet, setSheet] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
    if (visible && playing && !sheet && !locked) {
      timer.current = setTimeout(() => setVisible(false), HIDE_MS);
    }
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, [visible, playing, sheet, locked]);

  useEffect(
    () => () => {
      if (hintTimer.current) {
        clearTimeout(hintTimer.current);
      }
    },
    [],
  );

  const onSingleTap = () => {
    if (locked) {
      setUnlockHint(true);
      if (hintTimer.current) {
        clearTimeout(hintTimer.current);
      }
      hintTimer.current = setTimeout(() => setUnlockHint(false), 2500);
      return;
    }
    setVisible(v => !v);
  };

  const fraction = durationMs > 0 ? positionMs / durationMs : 0;
  const shade = withAlpha(BLACK, 0.45);
  const lockLabel = t('app.player.lock', {defaultValue: 'Taper pour verrouiller'});
  const unlockLabel = t('app.player.unlock', {defaultValue: 'Taper pour déverrouiller'});

  return (
    <View style={{flex: 1, backgroundColor: BLACK}} testID="screen-video">
      <View style={fullscreen ? {flex: 1} : {flex: 1, justifyContent: 'center'}}>
        <View style={fullscreen ? {flex: 1} : {width: '100%', aspectRatio: 16 / 9}}>
          {video}
          {gestures({enabled: !locked, onSingleTap})}
        </View>
      </View>

      {locked ? (
        unlockHint ? (
          <View style={styles.center} pointerEvents="box-none">
            <Pressable
              onPress={() => {
                setLocked(false);
                setUnlockHint(false);
                setVisible(true);
              }}
              accessibilityRole="button"
              style={[styles.pill, {backgroundColor: shade}]}
              testID="player-unlock">
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                <Path d="M7 11V8a5 5 0 0 1 9.5-2M6 11h12v9H6z" stroke={WHITE} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Text style={styles.pillText}>{unlockLabel}</Text>
            </Pressable>
          </View>
        ) : null
      ) : visible ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <View style={[styles.top, {paddingTop: insets.top + 8, backgroundColor: shade}]} pointerEvents="box-none">
            <Pressable
              onPress={onBack}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t('app.reader.back', {defaultValue: 'Retour'})}
              testID="player-exit">
              <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
                <Path d="M15 5l-7 7 7 7" stroke={WHITE} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </Pressable>
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>
            <View
              accessibilityRole="button"
              accessibilityState={{disabled: true}}
              accessibilityLabel={t('app.reader.download', {defaultValue: 'Télécharger'}) + ' (verrouillé)'}
              style={{opacity: 0.5}}
              testID="player-download-locked">
              <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
                <Path d="M12 3v11M7 10l5 5 5-5M5 20h14" stroke={WHITE} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                <Rect x={14} y={14} width={8} height={7} rx={1.5} fill={BLACK} stroke={WHITE} strokeWidth={1.4} />
                <Path d="M16 14v-1.5a2 2 0 0 1 4 0V14" stroke={WHITE} strokeWidth={1.4} />
              </Svg>
            </View>
          </View>

          <Pressable
            onPress={() => {
              setLocked(true);
              setSheet(false);
            }}
            accessibilityRole="button"
            style={styles.lock}
            testID="player-lock">
            <Svg width={30} height={30} viewBox="0 0 24 24" fill="none">
              <Path d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6zM10 15.5h4" stroke={WHITE} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
            <Text style={styles.pillText}>{lockLabel}</Text>
          </Pressable>

          <View style={styles.mid} pointerEvents="box-none">
            <Skip dir="back" onPress={() => playerStore.seekBy(-SKIP_MS)} />
            <Pressable
              onPress={playerStore.togglePlay}
              accessibilityRole="button"
              accessibilityLabel={playing ? t('app.player.pause') : t('app.player.play')}
              hitSlop={16}
              testID="player-toggle">
              <Svg width={56} height={56} viewBox="0 0 24 24" fill={WHITE}>
                {playing ? (
                  <>
                    <Rect x={6} y={4} width={4} height={16} rx={1} />
                    <Rect x={14} y={4} width={4} height={16} rx={1} />
                  </>
                ) : (
                  <Path d="M7 4.5v15l12-7.5z" />
                )}
              </Svg>
            </Pressable>
            <Skip dir="fwd" onPress={() => playerStore.seekBy(SKIP_MS)} />
          </View>

          <View style={[styles.bottom, {paddingBottom: insets.bottom + 8, backgroundColor: shade}]} pointerEvents="box-none">
            <View style={styles.timeRow}>
              <Text style={styles.time}>{formatClock(positionMs)}</Text>
              <SeekBar fraction={fraction} onSeek={playerStore.seekToFraction} />
              <Text style={styles.time}>{formatClock(durationMs)}</Text>
            </View>
            <View style={styles.actions}>
              <Pressable
                onPress={playerStore.togglePlay}
                accessibilityRole="button"
                accessibilityLabel={playing ? t('app.player.pause') : t('app.player.play')}>
                <Svg width={30} height={30} viewBox="0 0 24 24" fill={WHITE}>
                  {playing ? (
                    <>
                      <Rect x={6} y={4} width={4} height={16} rx={1} />
                      <Rect x={14} y={4} width={4} height={16} rx={1} />
                    </>
                  ) : (
                    <Path d="M7 4.5v15l12-7.5z" />
                  )}
                </Svg>
              </Pressable>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 28}}>
                <Pressable
                  onPress={() => setSheet(true)}
                  accessibilityRole="button"
                  accessibilityLabel={t('app.player.speedLabel')}
                  style={styles.speedBtn}
                  testID="player-speed-open">
                  <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
                    <Path d="M4 16a8 8 0 1 1 16 0M12 16l4-5" stroke={WHITE} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                    <Circle cx={12} cy={16} r={1.3} fill={WHITE} />
                  </Svg>
                  <Text style={styles.time}>{String(speed).toUpperCase()}X</Text>
                </Pressable>
                <Pressable
                  onPress={() => playerStore.setFullscreen(!fullscreen)}
                  accessibilityRole="button"
                  accessibilityLabel={fullscreen ? t('app.player.exitFullscreen') : t('app.player.fullscreen')}
                  testID="player-fullscreen">
                  <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
                    <Rect x={4} y={4} width={16} height={16} rx={2.5} stroke={WHITE} strokeWidth={1.8} />
                    <Path d="M4 13h7v7M20 11h-7V4" stroke={WHITE} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      ) : null}

      {sheet ? (
        <>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSheet(false)} accessible={false} />
          <View style={[styles.sheet, {paddingBottom: insets.bottom + 12, backgroundColor: withAlpha(colors.bgDarkPremium, 0.97)}]} testID="player-speed-sheet">
            <View style={[styles.handle, {backgroundColor: withAlpha(WHITE, 0.3)}]} />
            <Text style={[styles.sheetTitle, {color: withAlpha(WHITE, 0.55)}]}>{t('app.player.speedLabel', {defaultValue: 'Vitesse'})}</Text>
            <View style={{height: 1, backgroundColor: withAlpha(WHITE, 0.15), marginHorizontal: 32}} />
            {SPEED_OPTIONS.map(s => {
              const on = s === speed;
              return (
                <Pressable
                  key={s}
                  onPress={() => {
                    playerStore.setSpeed(s);
                    setSheet(false);
                  }}
                  accessibilityRole="menuitem"
                  accessibilityState={{selected: on}}
                  style={styles.opt}
                  testID={`player-speed-${s}`}>
                  <Text style={[styles.optText, {color: on ? colors.success : WHITE}]}>{s}x</Text>
                  {on ? (
                    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
                      <Path d="M5 12.5l4.5 4.5L19 7" stroke={colors.success} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  top: {alignItems: 'center', flexDirection: 'row', gap: 14, paddingBottom: 10, paddingHorizontal: 16},
  title: {color: WHITE, flex: 1, fontSize: 19, fontWeight: '600'},
  lock: {alignItems: 'center', alignSelf: 'flex-end', flexDirection: 'row', gap: 10, marginRight: 24, marginTop: 14},
  mid: {alignItems: 'center', flex: 1, flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 24},
  skip: {alignItems: 'center', height: 48, justifyContent: 'center', width: 48},
  skipText: {color: WHITE, fontSize: 14, fontWeight: '700', position: 'absolute'},
  bottom: {paddingHorizontal: 16, paddingTop: 8},
  timeRow: {alignItems: 'center', flexDirection: 'row', gap: 12},
  time: {color: WHITE, fontSize: 15, fontVariant: ['tabular-nums']},
  seek: {flex: 1, height: 28, justifyContent: 'center'},
  track: {borderRadius: 2, height: 4, overflow: 'hidden'},
  thumb: {borderRadius: 7, height: 14, marginLeft: -7, position: 'absolute', width: 14},
  actions: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 8},
  speedBtn: {alignItems: 'center', flexDirection: 'row', gap: 6},
  center: {position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center'},
  pill: {alignItems: 'center', borderRadius: 24, flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingVertical: 12},
  pillText: {color: WHITE, fontSize: 18},
  sheet: {borderTopLeftRadius: 24, borderTopRightRadius: 24, bottom: 0, left: 0, paddingTop: 10, position: 'absolute', right: 0},
  handle: {alignSelf: 'center', borderRadius: 3, height: 5, marginBottom: 18, width: 48},
  sheetTitle: {fontSize: 26, fontWeight: '500', paddingBottom: 14, paddingHorizontal: 32},
  opt: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 64, paddingHorizontal: 32},
  optText: {fontSize: 22},
});
