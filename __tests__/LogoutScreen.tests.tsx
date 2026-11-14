import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {Alert} from 'react-native';
import {SettingsScreen} from '@features/member-space/rooms/settings/screens/SettingsScreen';
import {ThemeProvider} from '@shared/designsystem';
import {initI18n} from '@shared/i18n';
import {sessionStore} from '@core/session';

jest.spyOn(Alert, 'alert');

describe('SettingsScreen logout provisoire', () => {
  beforeAll(() => {
    initI18n('fr');
  });

  beforeEach(async () => {
    (Alert.alert as jest.Mock).mockClear();
    await sessionStore.clearSessionAsync();
  });

  it('affiche le bouton déconnexion', () => {
    const tree = renderer.create(
      <ThemeProvider>
        <SettingsScreen />
      </ThemeProvider>,
    );
    expect(tree.root.findByProps({testID: 'settings-logout'})).toBeTruthy();
  });

  it('ouvre la confirmation', () => {
    const tree = renderer.create(
      <ThemeProvider>
        <SettingsScreen />
      </ThemeProvider>,
    );
    act(() => {
      tree.root.findByProps({testID: 'settings-logout'}).props.onPress();
    });
    expect(Alert.alert).toHaveBeenCalled();
  });
});
