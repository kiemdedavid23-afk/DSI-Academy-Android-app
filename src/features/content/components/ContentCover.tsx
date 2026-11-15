/**
 * Média d'un contenu : vignette du Worker (https), sinon illustration sombre de
 * la maison + icône. Format 2:3 pour un livre (ContentCard.jsx du site).
 */

import React, {useState} from 'react';
import {Image, StyleSheet, View} from 'react-native';
import {Icon, useTheme, withAlpha, type IconName} from '@shared/designsystem';

const FALLBACK_BOOK = require('@assets/images/academy/house-library.webp');

export type ContentCoverProps = {
  thumbnailUrl: string | null;
  /** Icône de la maison quand il n'y a pas d'image. */
  icon?: IconName;
  style?: object;
};

export function ContentCover({
  thumbnailUrl,
  icon = 'BookIcon',
  style,
}: ContentCoverProps) {
  const {colors, radii} = useTheme();
  const [failed, setFailed] = useState(false);
  const hasImage = Boolean(thumbnailUrl) && !failed;

  return (
    <View
      style={[
        styles.box,
        {backgroundColor: colors.bgDarkPremium, borderRadius: radii.md},
        style,
      ]}>
      {hasImage ? (
        <Image
          source={{uri: thumbnailUrl as string}}
          style={styles.fill}
          resizeMode="cover"
          onError={() => setFailed(true)}
          accessible={false}
        />
      ) : (
        <>
          <Image source={FALLBACK_BOOK} style={styles.fill} resizeMode="cover" />
          <View
            style={[
              styles.fill,
              styles.center,
              {backgroundColor: withAlpha(colors.bgDarkPremium, 0.55)},
            ]}>
            <Icon name={icon} size={32} color={colors.goldPrestige} />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {aspectRatio: 2 / 3, overflow: 'hidden', width: '100%'},
  fill: {...StyleSheet.absoluteFill},
  center: {alignItems: 'center', justifyContent: 'center'},
});
