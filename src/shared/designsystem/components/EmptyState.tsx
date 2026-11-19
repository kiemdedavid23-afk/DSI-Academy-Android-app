import React from 'react';
import {StyleSheet, View, type StyleProp, type ViewStyle} from 'react-native';
import {Icon, type IconName} from '../icons';
import {useTheme} from '../theme/ThemeProvider';
import {Button} from './Button';
import {Text} from './Text';

export type EmptyStateProps = {
  message: string;
  title?: string;
  /** Icône facultative : aucune par défaut (le site n'en impose pas). */
  icon?: IconName;
  /** Variante dorée (cercle à contour doré, titre serif) : états vides du commerce. */
  accent?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** État « vide » : message centré, icône et action facultatives (.dsi-empty du site). */
export function EmptyState({
  message,
  title,
  icon,
  accent = false,
  actionLabel,
  onAction,
  style,
  testID,
}: EmptyStateProps) {
  const {colors, spacing} = useTheme();
  return (
    <View
      testID={testID}
      style={[
        styles.column,
        {
          gap: spacing.md,
          paddingVertical: spacing.xxxl,
          paddingHorizontal: spacing.lg,
        },
        style,
      ]}>
      {icon ? (
        <View
          style={[
            styles.iconCircle,
            accent
              ? styles.iconCircleAccent
              : null,
            accent
              ? {backgroundColor: colors.goldLight, borderColor: colors.goldBorder}
              : {backgroundColor: colors.bgSurfaceAlt, borderColor: colors.borderLight},
          ]}>
          <Icon
            name={icon}
            size={accent ? 30 : 26}
            color={accent ? colors.goldPrestige : colors.textSecondary}
          />
        </View>
      ) : null}
      {title ? (
        <Text variant={accent ? 'cardTitle' : 'bodyStrong'} color="primary" style={styles.centered}>
          {title}
        </Text>
      ) : null}
      <Text variant="bodyMedium" color="secondary" style={styles.centered}>
        {message}
      </Text>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="secondary" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleAccent: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  centered: {
    textAlign: 'center',
  },
});
