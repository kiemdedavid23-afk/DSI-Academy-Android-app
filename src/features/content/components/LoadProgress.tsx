import React, {useEffect, useRef, useState, useSyncExternalStore} from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Platform,
  StyleSheet,
  ToastAndroid,
  View,
} from 'react-native';
import {Text, useTheme} from '@shared/designsystem';
import i18n, {useTranslation} from '@shared/i18n';
import {formatSeconds, loadTrace, type TraceSnapshot} from '@core/media/loadTrace';

function summary(s: TraceSnapshot): string {
  const total = formatSeconds((s.finishedAt ?? Date.now()) - s.startedAt);
  const parts = s.steps
    .map(step => `${i18n.t(`content.trace.${step.id}`)} ${formatSeconds(step.ms)}`)
    .join(' · ');
  const head = s.failed
    ? i18n.t('content.trace.failed', {total})
    : i18n.t('content.trace.done', {total});
  return `${head}\n${parts}`;
}

// Bilan affiché en fin de chargement (durée de chaque étape).
loadTrace.onFinish(s => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(summary(s), ToastAndroid.LONG);
  }
});

type BarProps = {percent: number | null; trackColor: string; fillColor: string};

/** Barre de progression : remplie selon le pourcentage, ou animée quand il est inconnu. */
export function ProgressBar({percent, trackColor, fillColor}: BarProps) {
  const [width, setWidth] = useState(0);
  const slide = useRef(new Animated.Value(0)).current;
  const indeterminate = percent === null;
  useEffect(() => {
    if (!indeterminate) {
      return undefined;
    }
    const loop = Animated.loop(
      Animated.timing(slide, {toValue: 1, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true}),
    );
    loop.start();
    return () => loop.stop();
  }, [indeterminate, slide]);
  const seg = width * 0.35;
  return (
    <View
      onLayout={e => setWidth(e.nativeEvent.layout.width)}
      style={[styles.track, {backgroundColor: trackColor}]}>
      {indeterminate ? (
        <Animated.View
          style={[
            styles.fill,
            {
              width: seg,
              backgroundColor: fillColor,
              transform: [{translateX: slide.interpolate({inputRange: [0, 1], outputRange: [-seg, width]})}],
            },
          ]}
        />
      ) : (
        <View style={[styles.fill, {width: `${percent}%`, backgroundColor: fillColor}]} />
      )}
    </View>
  );
}

/**
 * Chargement dans le lecteur : pourcentage réel au centre quand il est connu
 * (téléchargement, mémoire tampon), barre animée sinon. La miniature, si elle
 * existe, s'affiche floutée en arrière-plan.
 */
export function LoadProgress({thumbnailUrl}: {thumbnailUrl?: string | null}) {
  const {t} = useTranslation();
  const {colors, spacing} = useTheme();
  const snap = useSyncExternalStore(loadTrace.subscribe, loadTrace.get);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);
  const percent = snap.progress;
  const running = snap.startedAt > 0 && snap.finishedAt === null && snap.currentId !== null;
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('content.loading')}
      accessibilityState={{busy: true}}
      accessibilityValue={percent !== null ? {min: 0, max: 100, now: percent} : undefined}
      style={styles.fillView}>
      {thumbnailUrl ? (
        <Image
          source={{uri: thumbnailUrl}}
          blurRadius={16}
          resizeMode="cover"
          style={[StyleSheet.absoluteFill, styles.cover]}
        />
      ) : null}
      <View style={[styles.center, {padding: spacing.xxxl}]}>
        {percent !== null ? (
          <Text variant="display">{`${percent} %`}</Text>
        ) : (
          <ActivityIndicator size="small" color={colors.royalStart} />
        )}
        <View style={{width: '70%', marginTop: spacing.xl}}>
          <ProgressBar percent={percent} trackColor={colors.borderLight} fillColor={colors.royalStart} />
        </View>
        {running && snap.currentId ? (
          <Text variant="body" color="muted" style={{marginTop: spacing.md}}>
            {`${t(`content.trace.${snap.currentId}`)} · ${formatSeconds(now - snap.currentSince)}`}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** Pastille de mémoire tampon par-dessus une vidéo ou un audio déjà affiché. */
export function BufferOverlay({percent}: {percent: number | null}) {
  const {colors, spacing} = useTheme();
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center]}>
      <View style={[styles.pill, {padding: spacing.lg}]}>
        <Text variant="bodyStrong" style={styles.pillText}>
          {percent !== null ? `${percent} %` : '…'}
        </Text>
        <View style={{width: 120, marginTop: spacing.sm}}>
          <ProgressBar percent={percent} trackColor="rgba(255,255,255,0.3)" fillColor={colors.royalStart} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fillView: {flex: 1},
  cover: {opacity: 0.3},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  track: {height: 6, borderRadius: 3, overflow: 'hidden', width: '100%'},
  fill: {height: 6, borderRadius: 3},
  pill: {backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 16, alignItems: 'center'},
  pillText: {color: '#FFFFFF'},
});
