/**
 * Fournisseurs racine : thème, i18n, préférences, session sécurisée.
 * Hydratation complète avant la navigation (pas de flash de thème / session).
 */

import React, {useEffect, useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {ThemeProvider, LoadingState, useTheme} from '@shared/designsystem';
import {initI18n, changeLanguage} from '@shared/i18n';
import {preferencesStore} from '@shared/preferences';
import {sessionStore} from '@core/session';
import {RootNavigator} from '../navigation/RootNavigator';
import {featureFlags} from '@core/config/featureFlags';
import {ThemeGalleryScreen} from '../dev/ThemeGalleryScreen';

function Bootstrap({children}: {children: React.ReactNode}) {
  const [ready, setReady] = useState(false);
  const {colors} = useTheme();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const prefs = await preferencesStore.hydrate();
      initI18n(prefs.language);
      await sessionStore.hydrate();
      if (!cancelled) {
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const unsub = preferencesStore.subscribe(() => {
      const lang = preferencesStore.get().language;
      void changeLanguage(lang);
    });
    return unsub;
  }, []);

  if (!ready) {
    return (
      <View style={[styles.fill, {backgroundColor: colors.bgApp}]}>
        <LoadingState accessibilityLabel="Chargement…" fill />
      </View>
    );
  }

  return <>{children}</>;
}

export function AppProviders() {
  const content = featureFlags.devGallery ? (
    <ThemeGalleryScreen />
  ) : (
    <RootNavigator />
  );

  return (
    <ThemeProvider>
      <Bootstrap>{content}</Bootstrap>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
});
