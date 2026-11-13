import React from 'react';
import {ThemeProvider} from '@shared/designsystem';
import {ThemeGalleryScreen} from './dev/ThemeGalleryScreen';

/**
 * Racine de l'app. Pour l'instant : le thème et l'écran de test du design system
 * (temporaire, retiré à l'étape 2).
 */
export default function App() {
  return (
    <ThemeProvider>
      <ThemeGalleryScreen />
    </ThemeProvider>
  );
}
