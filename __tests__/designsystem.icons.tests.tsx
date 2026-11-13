import React from 'react';
import Svg from 'react-native-svg';
import {act, create, type ReactTestRenderer} from 'react-test-renderer';
import {Icon, ICON_NAMES, iconShapes, ThemeProvider, darkColors, lightColors, themePreferences} from '@shared/designsystem';

async function render(ui: React.ReactElement, mode: 'light' | 'dark' = 'light') {
  themePreferences.reset();
  themePreferences.setTheme(mode);
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(<ThemeProvider>{ui}</ThemeProvider>);
  });
  return renderer;
}

describe('icônes (première série)', () => {
  it('la série contient exactement les icônes validées', () => {
    expect([...ICON_NAMES].sort()).toEqual(
      [
        'WarningIcon',
        'RefreshIcon',
        'XIcon',
        'ChevronLeftIcon',
        'ChevronRightIcon',
        'ChevronDownIcon',
        'CheckIcon',
        'SearchIcon',
        'UserIcon',
        'BellIcon',
        'EyeIcon',
        'EyeOffIcon',
      ].sort(),
    );
  });

  it('chaque icône a au moins une forme, sans couleur en dur', () => {
    for (const name of ICON_NAMES) {
      const shapes = iconShapes[name];
      expect(shapes.length).toBeGreaterThan(0);
      expect(JSON.stringify(shapes)).not.toMatch(/#[0-9a-fA-F]{3,8}|rgb|currentColor/);
    }
  });

  it('reprend les chemins du site (exemples)', () => {
    expect(iconShapes.CheckIcon[0]).toEqual({type: 'path', d: 'M5 12.5l4.5 4.5L19 7.5'});
    expect(iconShapes.XIcon[0]).toEqual({type: 'path', d: 'M6 6l12 12M18 6L6 18'});
    expect(iconShapes.SearchIcon[0]).toEqual({type: 'circle', cx: 11, cy: 11, r: 6.5});
  });

  it('couleur par défaut : texte principal du thème, clair puis sombre', async () => {
    const light = await render(<Icon name="CheckIcon" />);
    expect(light.root.findByType(Svg).props.stroke).toBe(lightColors.textPrimary);
    const dark = await render(<Icon name="CheckIcon" />, 'dark');
    expect(dark.root.findByType(Svg).props.stroke).toBe(darkColors.textPrimary);
  });

  it('couleur et taille en props, viewBox 24, trait 1,8', async () => {
    const r = await render(<Icon name="BellIcon" size={32} color="#123456" />);
    const props = r.root.findByType(Svg).props;
    expect(props.stroke).toBe('#123456');
    expect(props.width).toBe(32);
    expect(props.height).toBe(32);
    expect(props.viewBox).toBe('0 0 24 24');
    expect(props.strokeWidth).toBe(1.8);
  });

  it('caché aux lecteurs d\'écran', async () => {
    const r = await render(<Icon name="UserIcon" />);
    expect(r.root.findByType(Svg).props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('rend toutes les icônes sans erreur', async () => {
    for (const name of ICON_NAMES) {
      const r = await render(<Icon name={name} />);
      expect(r.toJSON()).not.toBeNull();
    }
  });
});
