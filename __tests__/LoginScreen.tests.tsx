import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {LoginScreen} from '@features/auth/login/screens/LoginScreen';
import {ThemeProvider} from '@shared/designsystem';
import {initI18n} from '@shared/i18n';
import {loginStore} from '@features/auth/login/store/loginStore';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({navigate: mockNavigate}),
  };
});

jest.mock('@core/api/endpoints/payment/auth.api', () => ({
  connecter: jest.fn(),
}));

function renderScreen() {
  return renderer.create(
    <ThemeProvider>
      <LoginScreen />
    </ThemeProvider>,
  );
}

describe('LoginScreen', () => {
  beforeAll(() => {
    initI18n('fr');
  });

  beforeEach(() => {
    loginStore.reset();
    mockNavigate.mockReset();
  });

  it('affiche les champs identifiant et mot de passe', () => {
    const tree = renderScreen();
    expect(tree.root.findByProps({testID: 'login-identifier'})).toBeTruthy();
    expect(tree.root.findByProps({testID: 'login-password'})).toBeTruthy();
    expect(tree.root.findByProps({testID: 'login-submit'})).toBeTruthy();
    expect(tree.root.findByProps({testID: 'login-remember'})).toBeTruthy();
    expect(
      tree.root.findByProps({testID: 'login-create-account'}),
    ).toBeTruthy();
  });

  it('n’affiche pas mot de passe oublié', () => {
    const tree = renderScreen();
    const json = JSON.stringify(tree.toJSON());
    expect(json).not.toMatch(/Mot de passe oublié/i);
    expect(json).not.toMatch(/forgot/i);
  });

  it('valide les champs vides sans appeler le store loading', () => {
    const tree = renderScreen();
    const btn = tree.root.findByProps({testID: 'login-submit'});
    act(() => {
      btn.props.onPress();
    });
    expect(loginStore.getState().status).toBe('idle');
  });

  it('lien Créer un compte navigue vers RegisterBrowser', () => {
    const tree = renderScreen();
    const link = tree.root.findByProps({testID: 'login-create-account'});
    act(() => {
      link.props.onPress();
    });
    expect(mockNavigate).toHaveBeenCalledWith('RegisterBrowser');
  });
});
