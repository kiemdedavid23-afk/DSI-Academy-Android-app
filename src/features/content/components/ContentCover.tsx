/**
 * Média d'un contenu (site : ContentCover dans ContentCard.jsx) : vignette du
 * Worker (https), sinon illustration sombre de la maison avec son icône dans
 * une pastille. Format selon la maison : livre 2:3, vidéo et formation 16:9,
 * audio carré. Les enfants (pastilles, bouton de lecture) se superposent.
 */

import React, {useState} from 'react';
import {Image, StyleSheet, View, type StyleProp, type ViewStyle} from 'react-native';
import {Icon, useTheme, withAlpha} from '@shared/designsystem';
import {HOUSE_VISUALS, type HouseId} from '@shared/houses/houseVisuals';

const ASPECT = {book: 2 / 3, video: 16 / 9, course: 16 / 9, audio: 1} as const;
const FALLBACK_BADGE = 44;

export type ContentCoverProps = {
  thumbnailUrl: string | null;
  /** Maison du contenu (défaut : Bibliothèque). */
  houseId?: HouseId;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

export function ContentCover({
  thumbnailUrl,
  houseId = 'library',
  style,
  children,
}: ContentCoverProps) {
  const {colors, radii, glass} = useTheme();
  const [failed, setFailed] = useState(false);
  const visual = HOUSE_VISUALS[houseId];
  const hasImage = Boolean(thumbnailUrl) && !failed;

  return (
    <View
      style={[
        styles.box,
        {
          aspectRatio: ASPECT[visual.kind],
          backgroundColor: colors.bgDarkPremium,
          borderColor: glass.border,
          borderRadius: radii.md,
        },
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
          <Image source={visual.image} style={styles.fill} resizeMode="cover" />
          <View
            style={[
              styles.fill,
              {backgroundColor: withAlpha(colors.bgDarkPremium, 0.3)},
            ]}
          />
          <View style={[styles.fill, styles.center]}>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: withAlpha(colors.bgDarkPremium, 0.55),
                  borderColor: withAlpha(colors.textOnDark, 0.25),
                },
              ]}>
              <Icon name={visual.icon} size={24} color={colors.textOnDark} />
            </View>
          </View>
        </>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {borderWidth: 1, overflow: 'hidden', width: '100%'},
  fill: {...StyleSheet.absoluteFill},
  center: {alignItems: 'center', justifyContent: 'center'},
  badge: {
    alignItems: 'center',
    borderRadius: 9999,
    borderWidth: 1,
    height: FALLBACK_BADGE,
    justifyContent: 'center',
    width: FALLBACK_BADGE,
  },
});
