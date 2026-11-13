import React, {useState} from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import {Icon} from '../icons';
import {useTheme} from '../theme/ThemeProvider';
import {MAX_FONT_SIZE_MULTIPLIER} from '../theme/typography';
import {Text} from './Text';
import {textStyle} from './textStyle';

export type TextFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  helper?: string;
  error?: string;
  disabled?: boolean;
  /** Champ mot de passe : affiche le bouton afficher/masquer (libellés fournis par l'appelant). */
  secure?: boolean;
  showPasswordLabel?: string;
  hidePasswordLabel?: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoComplete?: TextInputProps['autoComplete'];
  maxLength?: number;
  onBlur?: () => void;
  onSubmitEditing?: () => void;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Champ de saisie : libellé, aide, erreur, état désactivé, mot de passe.
 * Manrope uniquement (R-DS-2). Hauteur minimale 48 dp.
 */
export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  helper,
  error,
  disabled = false,
  secure = false,
  showPasswordLabel,
  hidePasswordLabel,
  keyboardType,
  autoCapitalize = 'none',
  autoComplete,
  maxLength,
  onBlur,
  onSubmitEditing,
  testID,
  style,
}: TextFieldProps) {
  const theme = useTheme();
  const {colors, spacing, radii, touch} = theme;
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const hasError = typeof error === 'string' && error.length > 0;
  const borderColor = hasError
    ? colors.error
    : focused
    ? colors.goldPrestige
    : colors.borderLight;
  const hiding = secure && !revealed;
  const toggleLabel = revealed ? hidePasswordLabel : showPasswordLabel;

  return (
    <View style={[{opacity: disabled ? 0.6 : 1}, style]}>
      <Text variant="label" color="secondary" style={{marginBottom: spacing.xs}}>
        {label}
      </Text>
      <View
        style={[
          styles.row,
          {
            minHeight: touch.min,
            backgroundColor: colors.bgSurface,
            borderColor,
            borderWidth: focused ? 2 : 1,
            borderRadius: radii.md,
          },
        ]}>
        <TextInput
          testID={testID}
          style={[
            styles.input,
            textStyle(theme, 'field'),
            {color: colors.textPrimary, paddingHorizontal: spacing.md},
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          editable={!disabled}
          secureTextEntry={hiding}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          autoCorrect={false}
          maxLength={maxLength}
          maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
          accessibilityLabel={label}
          accessibilityState={{disabled}}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
          onSubmitEditing={onSubmitEditing}
        />
        {secure ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={toggleLabel}
            disabled={disabled}
            onPress={() => setRevealed(v => !v)}
            style={[styles.toggle, {width: touch.min, height: touch.min}]}>
            <Icon
              name={revealed ? 'EyeOffIcon' : 'EyeIcon'}
              color={colors.textSecondary}
            />
          </Pressable>
        ) : null}
      </View>
      {hasError ? (
        <Text
          variant="caption"
          color="error"
          accessibilityLiveRegion="polite"
          style={{marginTop: spacing.xs}}>
          {error}
        </Text>
      ) : helper ? (
        <Text variant="caption" color="muted" style={{marginTop: spacing.xs}}>
          {helper}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    paddingVertical: 0,
    minHeight: 46,
  },
  toggle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
