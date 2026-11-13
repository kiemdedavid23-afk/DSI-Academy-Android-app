import React from 'react';
import {AppProviders} from './providers/AppProviders';

/**
 * Racine de l'app. Providers (thème, i18n, préférences) + navigation.
 * La galerie de test n'apparaît que si featureFlags.devGallery est vrai.
 */
export default function App() {
  return <AppProviders />;
}
