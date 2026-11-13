import React from 'react';
import {StyleSheet, View, type StyleProp, type ViewStyle} from 'react-native';
import {useTheme} from '../theme/ThemeProvider';
import {Skeleton, type SkeletonTone} from './Skeleton';

/**
 * Briques de squelette (SkeletonBlocks.jsx du site). Chaque écran compose son
 * squelette avec ces briques, en reprenant les dimensions de son vrai écran.
 */

type PanelProps = {
  /** Carte héros sombre à liseré or (utiliser `tone="onDark"` sur les formes). */
  dark?: boolean;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Carte de squelette (verre dépoli, comme les cartes réelles). */
export function SkeletonPanel({dark = false, children, style}: PanelProps) {
  const {colors, glass, radii, spacing} = useTheme();
  return (
    <View
      style={[
        styles.column,
        {
          gap: spacing.md,
          padding: spacing.xl,
          borderRadius: radii.lg,
          borderWidth: 1,
          backgroundColor: dark ? colors.bgDarkPremium : glass.bg,
          borderColor: dark ? colors.goldBorder : glass.border,
        },
        style,
      ]}>
      {children}
    </View>
  );
}

/** Carte « chiffre clé » : un petit libellé et une valeur. */
export function SkeletonStat({tone = 'auto'}: {tone?: SkeletonTone}) {
  const {spacing} = useTheme();
  return (
    <SkeletonPanel style={{gap: spacing.sm, padding: spacing.lg}}>
      <Skeleton width={72} height={11} tone={tone} />
      <Skeleton width="70%" height={20} tone={tone} />
    </SkeletonPanel>
  );
}

const ENTRY_WIDTHS = ['40%', '55%', '85%'] as const;

/** Entrée de liste ou de chronologie : date, titre, détail. */
export function SkeletonEntry({lines = 3}: {lines?: number}) {
  const {colors, radii, spacing} = useTheme();
  return (
    <View
      style={[
        styles.column,
        {
          gap: spacing.sm,
          padding: spacing.lg,
          borderRadius: radii.md,
          borderWidth: 1,
          backgroundColor: colors.bgSurfaceAlt,
          borderColor: colors.borderLight,
        },
      ]}>
      {Array.from({length: lines}, (_, i) => (
        <Skeleton
          key={i}
          width={ENTRY_WIDTHS[i % ENTRY_WIDTHS.length]}
          height={i === 1 ? 14 : 11}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    flexDirection: 'column',
    minWidth: 0,
  },
});
