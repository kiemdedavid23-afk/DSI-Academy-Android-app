/**
 * Fournisseurs racine : thème, i18n, hydratation des préférences.
 * Affiche LoadingState jusqu'à hydratation (pas de flash de thème).
 */

import React, {useEffect, useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {ThemeProvider, LoadingState, useTheme} from '@shared/designsystem';
import {initI18n, changeLanguage} from '@shared/i18n';
import {preferencesStore} from '@shared/preferences';
import {RootNavigator} from '../navigation/RootNavigator';
import {featureFlags} from '@core/config/featureFlags';
import {ThemeGalleryScreen} from '../dev/ThemeGalleryScreen';

function Bootstrap({children}: {children: React.ReactNode}) {
  const [ready, setReady] = useState(preferencesStore.isHydrated());
  const {colors} = useTheme();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const prefs = await preferencesStore.hydrate();
      initI18n(prefs.language);
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

/**
 * Exception L0d : le libellé d'accessibilité du bootstrap utilise une chaîne
 * fixe uniquement tant que i18n n'est pas prêt. Dès l'hydratation, plus aucun
 * texte en dur n'est affiché dans les écrans.
 */
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
