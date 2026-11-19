/** Sous-onglets soulignés (Accueil, Mes achats / Favoris, …). */

import React from 'react';
import {Pressable, ScrollView, View} from 'react-native';
import {Text, useTheme} from '@shared/designsystem';

export type UnderTab<T extends string> = {id: T; label: string};

export type CommerceUnderTabsProps<T extends string> = {
  tabs: readonly UnderTab<T>[];
  active: T;
  onChange: (id: T) => void;
  accessibilityLabel?: string;
};

export function CommerceUnderTabs<T extends string>({
  tabs,
  active,
  onChange,
  accessibilityLabel,
}: CommerceUnderTabsProps<T>) {
  const {colors, spacing} = useTheme();
  return (
    <View
      style={{
        borderBottomColor: colors.borderLight,
        borderBottomWidth: 1,
        marginHorizontal: spacing.xl,
      }}>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityLabel={accessibilityLabel}
      contentContainerStyle={{gap: spacing.xl}}
      style={{flexGrow: 0}}>
      {tabs.map(tab => {
        const on = tab.id === active;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            accessibilityRole="tab"
            accessibilityState={{selected: on}}
            testID={`commerce-tab-${tab.id}`}
            style={{minHeight: 44, justifyContent: 'center'}}>
            <Text variant={on ? 'bodyStrong' : 'bodyMedium'} color={on ? 'primary' : 'secondary'}>
              {tab.label}
            </Text>
            <View
              style={{
                backgroundColor: on ? colors.goldPrestige : 'transparent',
                height: 2,
                marginBottom: -1,
                marginTop: 4,
              }}
            />
          </Pressable>
        );
      })}
    </ScrollView>
    </View>
  );
}
