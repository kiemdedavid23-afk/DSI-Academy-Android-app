import React from 'react';
import {StyleSheet, View, type StyleProp, type ViewStyle} from 'react-native';
import {useTheme} from '../theme/ThemeProvider';
import {BrandLoader} from './BrandLoader';

export type LoadingStateProps = {
  /** Annonce « chargement » lue par TalkBack (texte fourni par l'appelant, i18n). */
  accessibilityLabel: string;
  /** Occupe tout l'espace disponible (écran de démarrage). Défaut : faux. */
  fill?: boolean;
  /** Largeur du logo en dp. */
  logoWidth?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * État « chargement » : le logo animé de la marque, aucun texte visible.
 * La région annonce le chargement aux lecteurs d'écran.
 */
export function LoadingState({
  accessibilityLabel,
  fill = false,
  logoWidth = 200,
  style,
  testID,
}: LoadingStateProps) {
  const {spacing} = useTheme();
  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{busy: true}}
      style={[
        styles.center,
        fill ? styles.fill : {paddingVertical: spacing.xxxl},
        style,
      ]}>
      <BrandLoader width={logoWidth} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {alignItems: 'center', justifyContent: 'center'},
  fill: {flex: 1},
});
