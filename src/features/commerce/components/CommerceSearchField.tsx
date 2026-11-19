/** Champ de recherche des sections (icône loupe à taille normale, libellé d'accessibilité). */

import React from 'react';
import {TextInput, View} from 'react-native';
import {Icon, useTheme} from '@shared/designsystem';

export type CommerceSearchFieldProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  accessibilityLabel: string;
  testID?: string;
};

export function CommerceSearchField({
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
  testID,
}: CommerceSearchFieldProps) {
  const {colors, spacing, radii} = useTheme();
  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: colors.bgSurface,
        borderColor: colors.borderLight,
        borderRadius: radii.lg,
        borderWidth: 1,
        flexDirection: 'row',
        gap: spacing.sm,
        marginHorizontal: spacing.xl,
        minHeight: 52,
        paddingHorizontal: spacing.lg,
      }}>
      <Icon name="SearchIcon" size={20} color={colors.textSecondary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        accessibilityLabel={accessibilityLabel}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        testID={testID}
        style={{color: colors.textPrimary, flex: 1, fontSize: 16, paddingVertical: 12}}
      />
    </View>
  );
}
