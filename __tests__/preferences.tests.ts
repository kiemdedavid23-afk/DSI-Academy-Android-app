/**
 * Tests préférences persistées : lecture/écriture, valeurs invalides, défauts.
 */

import {preferencesStore} from '@shared/preferences';
import {themePreferences} from '@shared/designsystem/theme/themePreferences';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const asyncStorageMock = require('@react-native-async-storage/async-storage');

describe('preferencesStore', () => {
  beforeEach(async () => {
    if (typeof asyncStorageMock.__reset === 'function') {
      asyncStorageMock.__reset();
    }
    themePreferences.reset();
    await preferencesStore.reset();
  });

  it('hydrate avec les défauts si le stockage est vide', async () => {
    const prefs = await preferencesStore.hydrate();
    expect(prefs).toEqual({
      language: 'fr',
      theme: 'light',
      reduceMotion: false,
      showAmountsXof: true,
    });
    expect(preferencesStore.isHydrated()).toBe(true);
  });

  it('persiste et relit la langue et le thème', async () => {
    await preferencesStore.hydrate();
    await preferencesStore.setLanguage('en');
    await preferencesStore.setTheme('dark');
    await preferencesStore.setReduceMotion(true);

    // Nouvelle « session » : reset mémoire puis hydrate
    themePreferences.reset();
    // Simule un redémarrage en relisant le storage
    const again = await preferencesStore.hydrate();
    expect(again.language).toBe('en');
    expect(again.theme).toBe('dark');
    expect(again.reduceMotion).toBe(true);
    expect(themePreferences.get().theme).toBe('dark');
    expect(themePreferences.get().reduceMotion).toBe(true);
  });

  it('ignore les valeurs invalides et revient aux défauts', async () => {
    await asyncStorageMock.default.setItem(
      'dsi_preferences',
      JSON.stringify({language: 'es', theme: 'neon', reduceMotion: 'oui'}),
    );
    const prefs = await preferencesStore.hydrate();
    expect(prefs.language).toBe('fr');
    expect(prefs.theme).toBe('light');
    expect(prefs.reduceMotion).toBe(false);
  });

  it('ne plante pas si le JSON stocké est illisible', async () => {
    await asyncStorageMock.default.setItem('dsi_preferences', '{cassé');
    const prefs = await preferencesStore.hydrate();
    expect(prefs.language).toBe('fr');
  });

  it('setShowAmountsXof fonctionne', async () => {
    await preferencesStore.hydrate();
    await preferencesStore.setShowAmountsXof(false);
    expect(preferencesStore.get().showAmountsXof).toBe(false);
  });
});
