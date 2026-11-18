/**
 * Média d'un produit (site : MpCover) : image https du Worker, sinon fond
 * sombre de la maison avec son icône. Format 4:3 pour les deux sources.
 * Les enfants (pastilles) se superposent.
 */

import React, {useState} from 'react';
import {Image, StyleSheet, View, type StyleProp, type ViewStyle} from 'react-native';
import {Icon, useTheme, withAlpha} from '@shared/designsystem';
import type {CommerceSource} from '../store/commerceTypes';

const ASPECT = 4 / 3;
const FALLBACK_BADGE = 44;

export type ProductCoverProps = {
  source: CommerceSource;
  coverUrl: string | null;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

export function ProductCover({source, coverUrl, style, children}: ProductCoverProps) {
  const {colors, radii, glass} = useTheme();
  const [failed, setFailed] = useState(false);
  const hasImage = Boolean(coverUrl) && !failed;

  return (
    <View
      style={[
        styles.box,
        {
          aspectRatio: ASPECT,
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
        <View style={[styles.fill, styles.center]}>
          <View
            style={[
              styles.badge,
              {
                backgroundColor: withAlpha(colors.bgDarkPremium, 0.55),
                borderColor: withAlpha(colors.textOnDark, 0.25),
              },
            ]}>
            <Icon
              name={source === 'shop' ? 'BagIcon' : 'StoreIcon'}
              size={22}
              color={colors.textOnDark}
            />
          </View>
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
  badge: {
    alignItems: 'center',
    borderRadius: FALLBACK_BADGE / 2,
    borderWidth: 1,
    height: FALLBACK_BADGE,
    justifyContent: 'center',
    width: FALLBACK_BADGE,
  },
});
