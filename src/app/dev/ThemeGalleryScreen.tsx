// src/app/dev/ThemeGalleryScreen.tsx
import React from 'react';
import { ScrollView, View, Switch } from 'react-native';
import { ThemeProvider, useTheme } from '@shared/designsystem/theme/ThemeProvider';
import { Text, Button } from '@shared/designsystem/components';
import { Icon } from '@shared/designsystem/icons/Icon';
import { themePreferences } from '@shared/designsystem/theme/themePreferences';

function Gallery() {
  const theme = useTheme();
  return (
    <ScrollView style={{ backgroundColor: theme.colors.bgApp, padding: 16 }}>
      <Text variant="display">Theme Gallery (test temporaire)</Text>
      <Text variant="body">Textes de test en dur uniquement ici.</Text>
      <Button accessibilityLabel="Primary">Primary</Button>
      <Button variant="secondary" accessibilityLabel="Secondary">Secondary</Button>
      <Icon name="WarningIcon" color={theme.colors.textPrimary} />
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
        <Button accessibilityLabel="System" onPress={() => themePreferences.setTheme('system')}>Système</Button>
        <Button accessibilityLabel="Light" onPress={() => themePreferences.setTheme('light')}>Clair</Button>
        <Button accessibilityLabel="Dark" onPress={() => themePreferences.setTheme('dark')}>Sombre</Button>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16 }}>
        <Text>Réduire les animations</Text>
        <Switch value={theme.reduceMotion} onValueChange={v => themePreferences.setReduceMotion(v)} />
      </View>
    </ScrollView>
  );
}

export function ThemeGalleryScreen() {
  return (
    <ThemeProvider>
      <Gallery />
    </ThemeProvider>
  );
}