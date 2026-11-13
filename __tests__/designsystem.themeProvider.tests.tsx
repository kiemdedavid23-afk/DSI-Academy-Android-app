import React from 'react';
import {AccessibilityInfo, Text as RNText} from 'react-native';
import {act, create, type ReactTestRenderer} from 'react-test-renderer';
import {
  ThemeProvider,
  buildTheme,
  resolveMode,
  resolveReduceMotion,
  useTheme,
  type Theme,
} from '@shared/designsystem/theme/ThemeProvider';
import {themePreferences} from '@shared/designsystem/theme/themePreferences';
import {darkColors, lightColors} from '@shared/designsystem/theme/colors';

describe('resolveMode', () => {
  it('suit le système quand la préférence est system', () => {
    expect(resolveMode('system', 'dark')).toBe('dark');
    expect(resolveMode('system', 'light')).toBe('light');
    expect(resolveMode('system', null)).toBe('light');
    expect(resolveMode('system', undefined)).toBe('light');
  });

  it('la préférence explicite l\'emporte sur le système', () => {
    expect(resolveMode('light', 'dark')).toBe('light');
    expect(resolveMode('dark', 'light')).toBe('dark');
  });
});

describe('resolveReduceMotion', () => {
  it('vrai si l\'un des deux réglages est actif', () => {
    expect(resolveReduceMotion(false, false)).toBe(false);
    expect(resolveReduceMotion(true, false)).toBe(true);
    expect(resolveReduceMotion(false, true)).toBe(true);
    expect(resolveReduceMotion(true, true)).toBe(true);
  });
});

describe('buildTheme', () => {
  it('clair : couleurs claires et élévation claire', () => {
    const theme = buildTheme('light', false);
    expect(theme.isDark).toBe(false);
    expect(theme.colors).toBe(lightColors);
    expect(theme.elevation.card).toBe(2);
    expect(theme.glass.bg).toBe('rgba(255, 255, 255, 0.86)');
  });

  it('sombre : couleurs sombres et élévation sombre', () => {
    const theme = buildTheme('dark', true);
    expect(theme.isDark).toBe(true);
    expect(theme.colors).toBe(darkColors);
    expect(theme.elevation.card).toBe(4);
    expect(theme.reduceMotion).toBe(true);
  });
});

describe('ThemeProvider', () => {
  let renderer: ReactTestRenderer | undefined;
  let latest: Theme | undefined;
  let motionListener: ((value: boolean) => void) | undefined;
  const remove = jest.fn();

  function Probe() {
    latest = useTheme();
    return <RNText>{latest.mode}</RNText>;
  }

  async function mount(systemReduceMotion = false) {
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(systemReduceMotion);
    jest
      .spyOn(AccessibilityInfo, 'addEventListener')
      .mockImplementation(((event: string, handler: (value: boolean) => void) => {
        if (event === 'reduceMotionChanged') {
          motionListener = handler;
        }
        return {remove};
      }) as never);
    await act(async () => {
      renderer = create(
        <ThemeProvider>
          <Probe />
        </ThemeProvider>,
      );
    });
  }

  beforeEach(() => {
    themePreferences.reset();
    latest = undefined;
    motionListener = undefined;
    remove.mockClear();
  });

  afterEach(() => {
    renderer?.unmount();
    renderer = undefined;
    jest.restoreAllMocks();
  });

  it('fournit un thème et lance une erreur hors du fournisseur', () => {
    function Bad() {
      useTheme();
      return null;
    }
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => create(<Bad />)).toThrow();
    spy.mockRestore();
  });

  it('thème clair forcé', async () => {
    themePreferences.setTheme('light');
    await mount();
    expect(latest?.mode).toBe('light');
  });

  it('thème sombre forcé, puis retour au clair', async () => {
    themePreferences.setTheme('dark');
    await mount();
    expect(latest?.mode).toBe('dark');
    await act(async () => {
      themePreferences.setTheme('light');
    });
    expect(latest?.mode).toBe('light');
  });

  it('le réglage de l\'app réduit les animations', async () => {
    await mount();
    expect(latest?.reduceMotion).toBe(false);
    await act(async () => {
      themePreferences.setReduceMotion(true);
    });
    expect(latest?.reduceMotion).toBe(true);
  });

  it('le réglage d\'accessibilité Android réduit les animations', async () => {
    await mount(true);
    expect(latest?.reduceMotion).toBe(true);
  });

  it('écoute les changements du réglage Android, et se désabonne', async () => {
    await mount(false);
    expect(latest?.reduceMotion).toBe(false);
    await act(async () => {
      motionListener?.(true);
    });
    expect(latest?.reduceMotion).toBe(true);
    await act(async () => {
      motionListener?.(false);
    });
    expect(latest?.reduceMotion).toBe(false);
    renderer?.unmount();
    renderer = undefined;
    expect(remove).toHaveBeenCalled();
  });
});
