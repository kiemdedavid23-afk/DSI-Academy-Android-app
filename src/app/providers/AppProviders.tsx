/**
 * Fournisseurs racine : thème, i18n, préférences, session sécurisée.
 * Hydratation complète avant la navigation (pas de flash de thème / session).
 */

import React, {useEffect, useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {ThemeProvider, LoadingState, useTheme} from '@shared/designsystem';
import {initI18n, changeLanguage, i18n} from '@shared/i18n';
import {preferencesStore} from '@shared/preferences';
import {sessionStore, sessionExpiryWatch} from '@core/session';
import {RootNavigator} from '../navigation/RootNavigator';
import {featureFlags} from '@core/config/featureFlags';
import {ThemeGalleryScreen} from '../dev/ThemeGalleryScreen';

// Ressources i18n initialisées de façon synchrone au chargement du module
// (français de repli) pour que le label de bootstrap ne soit jamais une clé brute.
initI18n('fr');

function Bootstrap({children}: {children: React.ReactNode}) {
  const [ready, setReady] = useState(false);
  const {colors, spacing} = useTheme();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const prefs = await preferencesStore.hydrate();
      // Applique la langue choisie (déjà initialisé en fr au chargement du module).
      initI18n(prefs.language);
      await sessionStore.hydrate();
      sessionExpiryWatch.start({
        getSession: () => sessionStore.getSession(),
        onExpire: reason => {
          void sessionStore.expireSession(reason);
        },
      });
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
      <View
        style={[
          styles.fill,
          {backgroundColor: colors.bgApp, padding: spacing.lg},
        ]}>
        <LoadingState
          accessibilityLabel={i18n.t('common.loading')}
          fill
        />
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
  },
});
