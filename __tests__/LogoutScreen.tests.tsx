import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {Alert} from 'react-native';
import {SettingsScreen} from '@features/member-space/rooms/settings/screens/SettingsScreen';
import {ThemeProvider} from '@shared/designsystem';
import {initI18n} from '@shared/i18n';
import {sessionStore} from '@core/session';

jest.spyOn(Alert, 'alert');

async function renderScreen() {
  let tree: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(
      <ThemeProvider>
        <SettingsScreen />
      </ThemeProvider>,
    );
  });
  return tree!;
}

describe('SettingsScreen logout provisoire', () => {
  beforeAll(() => {
    initI18n('fr');
  });

  beforeEach(async () => {
    (Alert.alert as jest.Mock).mockClear();
    await sessionStore.clearSessionAsync();
  });

  it('affiche le bouton déconnexion', async () => {
    const tree = await renderScreen();
    expect(tree.root.findByProps({testID: 'settings-logout'})).toBeTruthy();
  });

  it('ouvre la confirmation', async () => {
    const tree = await renderScreen();
    await act(async () => {
      tree.root.findByProps({testID: 'settings-logout'}).props.onPress();
    });
    expect(Alert.alert).toHaveBeenCalled();
  });
});
