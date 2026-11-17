import React from 'react';
import {ActivityIndicator, Image, Platform, StyleSheet, ToastAndroid, View} from 'react-native';
import {mediaStageColors, Text, useTheme, withAlpha} from '@shared/designsystem';
import i18n, {useTranslation} from '@shared/i18n';
import {loadTrace} from '@core/media/loadTrace';

// Message affiché en fin de chargement, le même quel que soit le type de
// contenu (audio, vidéo, PDF…) et quelle que soit l'étape où il s'est arrêté.
loadTrace.onFinish(s => {
  if (!s.failed && Platform.OS === 'android') {
    ToastAndroid.show(i18n.t('content.loadingDone'), ToastAndroid.SHORT);
  }
});

/**
 * Chargement dans le lecteur : un cercle qui tourne au centre avec « Chargement… »,
 * quel que soit le contenu ou l'étape en cours. La miniature, si elle existe,
 * s'affiche floutée en arrière-plan.
 */
export function LoadProgress({thumbnailUrl}: {thumbnailUrl?: string | null}) {
  const {t} = useTranslation();
  const {colors, spacing} = useTheme();
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('content.loading')}
      accessibilityState={{busy: true}}
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
        <ActivityIndicator size="small" color={colors.royalStart} />
        <Text variant="body" color="muted" style={{marginTop: spacing.md}}>
          {t('content.loading')}
        </Text>
      </View>
    </View>
  );
}

/** Pastille par-dessus une vidéo ou un audio déjà affiché, le temps d'une reprise de mémoire tampon. */
export function BufferOverlay({percent: _percent}: {percent: number | null}) {
  const {spacing} = useTheme();
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center]}>
      <View style={[styles.pill, {padding: spacing.lg, backgroundColor: withAlpha(mediaStageColors.background, 0.6)}]}>
        <ActivityIndicator size="small" color={mediaStageColors.text} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fillView: {flex: 1},
  cover: {opacity: 0.3},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  pill: {borderRadius: 16, alignItems: 'center'},
});
