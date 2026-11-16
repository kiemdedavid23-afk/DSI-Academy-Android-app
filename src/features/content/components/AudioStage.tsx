/**
 * Scène audio plein écran : l'image du Worker (vignette) en fond, titre, barre de progression
 * avec ±10 s, lecture/pause, boucle, minuteur, vitesse, muet et Télécharger verrouillé.
 */

import React, {useState} from 'react';
import {Image, Pressable, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Svg, {Path, Rect} from 'react-native-svg';
import {SLEEP_OPTIONS, SPEED_OPTIONS, formatClock} from '@core/media/playerNative';
import {mediaStageColors, Scrim, Text, useTheme, withAlpha} from '@shared/designsystem';
import {HOUSE_VISUALS} from '@shared/houses/houseVisuals';
import {useTranslation} from '@shared/i18n';
import {playerStore} from '../store/playerStore';

const WHITE = mediaStageColors.text;
const BLACK = mediaStageColors.background;
const SKIP_MS = 10_000;

type Props = {
  title: string;
  thumbnailUrl: string | null;
  playing: boolean;
  positionMs: number;
  durationMs: number;
  speed: number;
  loop: boolean;
  muted: boolean;
  sleepMinutes: number | null;
  buffering: boolean;
  onBack: () => void;
};

function Skip({dir}: {dir: 'back' | 'fwd'}) {
  return (
    <Pressable
      onPress={() => playerStore.seekBy(dir === 'back' ? -SKIP_MS : SKIP_MS)}
      accessibilityRole="button"
      accessibilityLabel={dir === 'back' ? '−10 s' : '+10 s'}
      hitSlop={8}
      style={styles.skip}
      testID={dir === 'back' ? 'player-back' : 'player-forward'}>
      <Svg width={40} height={40} viewBox="0 0 48 48" fill="none">
        <Path d={dir === 'back' ? 'M24 8a16 16 0 1 1-16 16' : 'M24 8a16 16 0 1 0 16 16'} stroke={WHITE} strokeWidth={3} strokeLinecap="round" />
        <Path d={dir === 'back' ? 'M18 2l6 6-6 6' : 'M30 2l-6 6 6 6'} stroke={WHITE} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      <Text style={styles.skipText}>10</Text>
    </Pressable>
  );
}

function Tool({label, active, onPress, testID, children}: {label: string; active?: boolean; onPress: () => void; testID: string; children: React.ReactNode}) {
  const {colors} = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{selected: !!active}}
      style={[styles.tool, active ? {backgroundColor: withAlpha(colors.goldPrestige, 0.3), borderColor: colors.goldPrestige} : null]}
      testID={testID}>
      {children}
    </Pressable>
  );
}

export function AudioStage(p: Props) {
  const {t} = useTranslation();
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const [failed, setFailed] = useState(false);
  const [sheet, setSheet] = useState<'speed' | 'sleep' | null>(null);
  const [w, setW] = useState(1);
  const fraction = p.durationMs > 0 ? Math.max(0, Math.min(1, p.positionMs / p.durationMs)) : 0;
  const pct = `${Math.round(fraction * 100)}%` as const;
  const hasImage = Boolean(p.thumbnailUrl) && !failed;

  return (
    <View style={{flex: 1, backgroundColor: BLACK}} testID="screen-audio">
      {hasImage ? (
        <Image source={{uri: p.thumbnailUrl as string}} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => setFailed(true)} accessible={false} />
      ) : (
        <Image source={HOUSE_VISUALS.audio.image} style={StyleSheet.absoluteFill} resizeMode="cover" accessible={false} />
      )}
      <Scrim from={0.35} to={0.85} />

      <View style={[styles.top, {paddingTop: insets.top + 10}]}>
        <Pressable onPress={p.onBack} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('app.reader.back', {defaultValue: 'Retour'})} testID="player-exit">
          <Svg width={30} height={30} viewBox="0 0 24 24" fill="none">
            <Path d="M5 9l7 7 7-7" stroke={WHITE} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Pressable>
        <Text style={styles.title} numberOfLines={2}>{p.title}</Text>
        <View
          accessibilityRole="button"
          accessibilityState={{disabled: true}}
          accessibilityLabel={t('app.reader.download', {defaultValue: 'Télécharger'}) + ' (verrouillé)'}
          style={{opacity: 0.55}}
          testID="player-download-locked">
          <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
            <Path d="M12 3v11M7 10l5 5 5-5M5 20h14" stroke={WHITE} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
            <Rect x={14} y={14} width={8} height={7} rx={1.5} fill={BLACK} stroke={WHITE} strokeWidth={1.4} />
            <Path d="M16 14v-1.5a2 2 0 0 1 4 0V14" stroke={WHITE} strokeWidth={1.4} />
          </Svg>
        </View>
      </View>

      <View style={{flex: 1}} />

      <View style={[styles.bottom, {paddingBottom: insets.bottom + 18}]}>
        <View style={styles.tools}>
          <Tool label={t('app.player.loop')} active={p.loop} onPress={playerStore.toggleLoop} testID="player-loop">
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <Path d="M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 0 1-4 4H4" stroke={WHITE} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Tool>
          <Tool label={t('app.player.sleep')} active={p.sleepMinutes !== null} onPress={() => setSheet('sleep')} testID="player-sleep">
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <Path d="M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 9v4l2.5 2M9 2h6" stroke={WHITE} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Tool>
          <Tool label={t('app.player.speedLabel')} active={p.speed !== 1} onPress={() => setSheet('speed')} testID="player-speed-open">
            <Text style={styles.toolText}>{p.speed}x</Text>
          </Tool>
          <Tool label={p.muted ? t('app.player.unmute') : t('app.player.mute')} active={p.muted} onPress={playerStore.toggleMute} testID="player-mute">
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <Path d="M4 9v6h4l5 4V5L8 9H4z" stroke={WHITE} strokeWidth={1.8} strokeLinejoin="round" />
              <Path d={p.muted ? 'M17 9l5 6M22 9l-5 6' : 'M16.5 9a4 4 0 0 1 0 6'} stroke={WHITE} strokeWidth={1.8} strokeLinecap="round" />
            </Svg>
          </Tool>
        </View>

        <View style={styles.progressRow}>
          <Skip dir="back" />
          <Pressable
            onLayout={e => setW(Math.max(1, e.nativeEvent.layout.width))}
            onPress={e => playerStore.seekToFraction(e.nativeEvent.locationX / w)}
            accessibilityRole="adjustable"
            accessibilityValue={{min: 0, max: 100, now: Math.round(fraction * 100)}}
            style={styles.seek}
            testID="player-progress">
            <View style={[styles.track, {backgroundColor: withAlpha(WHITE, 0.35)}]}>
              <View style={{width: pct, height: '100%', backgroundColor: WHITE}} />
            </View>
            <View style={[styles.bubble, {left: pct}]}>
              <Text style={styles.bubbleText}>{formatClock(p.positionMs)}/{formatClock(p.durationMs)}</Text>
            </View>
          </Pressable>
          <Skip dir="fwd" />
        </View>

        <View style={{alignItems: 'center'}}>
          <Pressable
            onPress={playerStore.togglePlay}
            accessibilityRole="button"
            accessibilityLabel={p.playing ? t('app.player.pause') : t('app.player.play')}
            style={[styles.play, {borderColor: colors.goldPrestige}]}
            testID="player-toggle">
            <Svg width={44} height={44} viewBox="0 0 24 24" fill={WHITE}>
              {p.playing ? (
                <>
                  <Rect x={6} y={4} width={4} height={16} rx={1} />
                  <Rect x={14} y={4} width={4} height={16} rx={1} />
                </>
              ) : (
                <Path d="M7 4.5v15l12-7.5z" />
              )}
            </Svg>
          </Pressable>
          {p.buffering ? <Text style={styles.buffering}>{t('app.player.buffering')}</Text> : null}
        </View>
      </View>

      {sheet ? (
        <>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSheet(null)} accessible={false} />
          <View style={[styles.sheet, {paddingBottom: insets.bottom + 12, backgroundColor: withAlpha(colors.bgDarkPremium, 0.97)}]} testID="player-sheet">
            <View style={[styles.handle, {backgroundColor: withAlpha(WHITE, 0.3)}]} />
            <Text style={[styles.sheetTitle, {color: withAlpha(WHITE, 0.55)}]}>
              {sheet === 'speed' ? t('app.player.speedLabel', {defaultValue: 'Vitesse'}) : t('app.player.sleep')}
            </Text>
            <View style={{height: 1, backgroundColor: withAlpha(WHITE, 0.15), marginHorizontal: 32}} />
            {sheet === 'sleep' ? (
              <Pressable
                onPress={() => {
                  playerStore.setSleep(null);
                  setSheet(null);
                }}
                style={styles.opt}
                accessibilityRole="menuitem"
                testID="player-sleep-off">
                <Text style={[styles.optText, {color: p.sleepMinutes === null ? colors.success : WHITE}]}>{t('app.player.sleepOff')}</Text>
              </Pressable>
            ) : null}
            {(sheet === 'speed' ? SPEED_OPTIONS : SLEEP_OPTIONS).map(v => {
              const on = sheet === 'speed' ? v === p.speed : v === p.sleepMinutes;
              return (
                <Pressable
                  key={v}
                  onPress={() => {
                    if (sheet === 'speed') {
                      playerStore.setSpeed(v);
                    } else {
                      playerStore.setSleep(v);
                    }
                    setSheet(null);
                  }}
                  accessibilityRole="menuitem"
                  accessibilityState={{selected: on}}
                  style={styles.opt}
                  testID={sheet === 'speed' ? `player-speed-${v}` : `player-sleep-${v}`}>
                  <Text style={[styles.optText, {color: on ? colors.success : WHITE}]}>
                    {sheet === 'speed' ? `${v}x` : t('app.player.sleepMinutes', {minutes: v})}
                  </Text>
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
  top: {alignItems: 'center', flexDirection: 'row', gap: 14, paddingHorizontal: 16},
  title: {color: WHITE, flex: 1, fontSize: 22, fontWeight: '600', textAlign: 'center'},
  bottom: {gap: 22, paddingHorizontal: 16},
  tools: {flexDirection: 'row', justifyContent: 'space-around'},
  tool: {alignItems: 'center', borderColor: 'transparent', borderRadius: 24, borderWidth: 1, height: 48, justifyContent: 'center', minWidth: 48, paddingHorizontal: 10},
  toolText: {color: WHITE, fontSize: 16, fontWeight: '700'},
  progressRow: {alignItems: 'center', flexDirection: 'row', gap: 10},
  skip: {alignItems: 'center', height: 40, justifyContent: 'center', width: 40},
  skipText: {color: WHITE, fontSize: 11, fontWeight: '700', position: 'absolute'},
  seek: {flex: 1, height: 44, justifyContent: 'center'},
  track: {height: 3, overflow: 'hidden'},
  bubble: {backgroundColor: WHITE, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 5, position: 'absolute', transform: [{translateX: -44}]},
  bubbleText: {color: BLACK, fontSize: 14, fontVariant: ['tabular-nums']},
  play: {alignItems: 'center', borderRadius: 48, borderWidth: 3, height: 96, justifyContent: 'center', width: 96},
  buffering: {color: WHITE, fontSize: 13, marginTop: 8, opacity: 0.8},
  sheet: {borderTopLeftRadius: 24, borderTopRightRadius: 24, bottom: 0, left: 0, paddingTop: 10, position: 'absolute', right: 0},
  handle: {alignSelf: 'center', borderRadius: 3, height: 5, marginBottom: 18, width: 48},
  sheetTitle: {fontSize: 26, fontWeight: '500', paddingBottom: 14, paddingHorizontal: 32},
  opt: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 60, paddingHorizontal: 32},
  optText: {fontSize: 22},
});
