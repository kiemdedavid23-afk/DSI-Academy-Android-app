/**
 * Média d'un produit ou d'une boutique (site : MpCover). Image https du Worker ;
 * sinon illustration sombre de la Marketplace avec l'initiale du titre en or.
 * Format 4:5 comme les cartes du site. Les enfants (pastilles) se superposent.
 */

import React, {useEffect, useState} from 'react';
import {Image, StyleSheet, View, type StyleProp, type ViewStyle} from 'react-native';
import {Text, useTheme, withAlpha} from '@shared/designsystem';
import {artFor} from '../logic/art';
import type {CommerceSource} from '../store/commerceTypes';

export const COVER_ASPECT = 4 / 5;

export type ProductCoverProps = {
  /** Conservé pour compatibilité : le visuel est celui de la Marketplace pour les deux sources. */
  source?: CommerceSource;
  coverUrl: string | null;
  /** Titre : sert à l'initiale et au choix de l'illustration. */
  title?: string | null;
  /** Largeur / hauteur (défaut 4/5). */
  aspect?: number;
  initialVariant?: 'display' | 'title' | 'cardTitle';
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

export function ProductCover({
  coverUrl,
  title,
  aspect = COVER_ASPECT,
  initialVariant = 'display',
  style,
  children,
}: ProductCoverProps) {
  const {colors, radii, glass} = useTheme();
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [coverUrl]);
  const hasImage = Boolean(coverUrl) && !failed;
  const initial = String(title ?? '').trim().slice(0, 1).toUpperCase();

  return (
    <View
      style={[
        styles.box,
        {
          aspectRatio: aspect,
          backgroundColor: colors.bgDarkPremium,
          borderColor: glass.border,
          borderRadius: radii.md,
        },
        style,
      ]}>
      {hasImage ? (
        <Image
          source={{uri: coverUrl as string}}
          style={styles.fill}
          resizeMode="cover"
          onError={() => setFailed(true)}
          accessible={false}
        />
      ) : (
        <View
          style={[styles.fill, styles.center, {borderColor: colors.goldBorder, borderWidth: 1}]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants">
          <Image source={artFor(title)} style={styles.fill} resizeMode="cover" />
          <View
            style={[styles.fill, {backgroundColor: withAlpha(colors.bgDarkPremium, 0.45)}]}
          />
          {initial ? (
            <Text variant={initialVariant} style={{color: colors.goldPrestige}}>
              {initial}
            </Text>
          ) : null}
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {borderWidth: 1, overflow: 'hidden', width: '100%'},
  fill: {...StyleSheet.absoluteFillObject},
  center: {alignItems: 'center', justifyContent: 'center'},
});
