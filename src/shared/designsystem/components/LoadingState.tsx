import React from 'react';
import {StyleSheet, View, type StyleProp, type ViewStyle} from 'react-native';
import {useTheme} from '../theme/ThemeProvider';
import {SkeletonEntry, SkeletonStat} from './SkeletonBlocks';

export type LoadingStateProps = {
  /** Annonce « chargement » lue par TalkBack (texte fourni par l'appelant, i18n). */
  accessibilityLabel: string;
  /** Squelette propre à l'écran. Défaut : une carte chiffre clé et trois entrées. */
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * État « chargement » : squelettes, aucun texte visible. La région annonce le
 * chargement aux lecteurs d'écran (SkeletonRegion du site).
 */
export function LoadingState({
  accessibilityLabel,
  children,
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
      style={[styles.column, {gap: spacing.md}, style]}>
      {children ?? (
        <>
          <SkeletonStat />
          <SkeletonEntry />
          <SkeletonEntry />
          <SkeletonEntry />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    flexDirection: 'column',
  },
});
