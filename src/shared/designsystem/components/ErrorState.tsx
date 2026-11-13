import React from 'react';
import {StyleSheet, View, type StyleProp, type ViewStyle} from 'react-native';
import {Icon} from '../icons';
import {useTheme} from '../theme/ThemeProvider';
import {Button} from './Button';
import {Text} from './Text';

export type ErrorStateProps = {
  message: string;
  title?: string;
  retryLabel?: string;
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** État « erreur » : message, et bouton « réessayer » si une action est fournie. */
export function ErrorState({
  message,
  title,
  retryLabel,
  onRetry,
  style,
  testID,
}: ErrorStateProps) {
  const {colors, spacing} = useTheme();
  return (
    <View
      testID={testID}
      accessibilityRole="alert"
      style={[
        styles.column,
        {
          gap: spacing.md,
          paddingVertical: spacing.xxxl,
          paddingHorizontal: spacing.lg,
        },
        style,
      ]}>
      <View
        style={[
          styles.iconCircle,
          {backgroundColor: colors.errorBg, borderColor: colors.errorBorder},
        ]}>
        <Icon name="WarningIcon" size={26} color={colors.error} />
      </View>
      {title ? (
        <Text variant="bodyStrong" color="primary" style={styles.centered}>
          {title}
        </Text>
      ) : null}
      <Text variant="bodyMedium" color="secondary" style={styles.centered}>
        {message}
      </Text>
      {retryLabel && onRetry ? (
        <Button label={retryLabel} onPress={onRetry} variant="secondary" />
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
  centered: {
    textAlign: 'center',
  },
});
