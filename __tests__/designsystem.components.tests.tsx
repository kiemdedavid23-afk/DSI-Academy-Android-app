import React from 'react';
import {
  Animated,
  Image,
  StyleSheet,
  Text as RNText,
  TextInput,
  View,
} from 'react-native';
import Svg from 'react-native-svg';
import {act, create, type ReactTestInstance, type ReactTestRenderer} from 'react-test-renderer';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  BrandLoader,
  Text,
  TextField,
  ThemeProvider,
  darkColors,
  lightColors,
  themePreferences,
  typography,
} from '@shared/designsystem';

type Options = {mode?: 'light' | 'dark'; reduceMotion?: boolean};

const mounted: ReactTestRenderer[] = [];

async function render(ui: React.ReactElement, options: Options = {}) {
  themePreferences.reset();
  themePreferences.setTheme(options.mode ?? 'light');
  themePreferences.setReduceMotion(options.reduceMotion ?? false);
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(<ThemeProvider>{ui}</ThemeProvider>);
  });
  mounted.push(renderer);
  return renderer;
}

function host(renderer: ReactTestRenderer, testID: string): ReactTestInstance {
  const found = renderer.root.findAll(
    node => node.props.testID === testID && typeof node.type === 'string',
  );
  expect(found.length).toBeGreaterThan(0);
  return found[0];
}

function textsOf(renderer: ReactTestRenderer): string[] {
  return renderer.root
    .findAllByType(RNText)
    .map(node => String(React.Children.toArray(node.props.children).join('')));
}

function familiesOf(renderer: ReactTestRenderer): string[] {
  return renderer.root
    .findAllByType(RNText)
    .map(node => String(StyleSheet.flatten(node.props.style)?.fontFamily));
}

/** Pressable est un composant memo : on le retrouve par son rôle d'accessibilité. */
function buttons(renderer: ReactTestRenderer): ReactTestInstance[] {
  const all = renderer.root.findAll(
    node => typeof node.type !== 'string' && node.props.accessibilityRole === 'button',
  );
  return all.filter(node => !all.includes(node.parent as ReactTestInstance));
}

function pressableStyle(node: ReactTestInstance, pressed = false) {
  const style = node.props.style;
  return StyleSheet.flatten(typeof style === 'function' ? style({pressed}) : style);
}

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(async () => {
  for (const renderer of mounted.splice(0)) {
    await act(async () => renderer.unmount());
  }
  jest.restoreAllMocks();
  themePreferences.reset();
});

describe('Text', () => {
  it('Manrope par défaut, corps 16 sp, couleur principale', async () => {
    const r = await render(<Text testID="t">Bonjour</Text>);
    const style = StyleSheet.flatten(r.root.findByType(RNText).props.style);
    expect(style.fontFamily).toBe('Manrope-Regular');
    expect(style.fontSize).toBe(16);
    expect(style.lineHeight).toBe(24);
    expect(style.color).toBe(lightColors.textPrimary);
  });

  it('variante titre : Fraunces', async () => {
    const r = await render(<Text variant="title">Titre</Text>);
    const style = StyleSheet.flatten(r.root.findByType(RNText).props.style);
    expect(style.fontFamily).toBe('Fraunces-SemiBold');
    expect(style.fontSize).toBe(typography.title.size);
  });

  it('italique Fraunces', async () => {
    const r = await render(
      <Text variant="subtitle" italic>
        Citation
      </Text>,
    );
    const style = StyleSheet.flatten(r.root.findByType(RNText).props.style);
    expect(style.fontFamily).toBe('Fraunces-SemiBoldItalic');
  });

  it('agrandissement du texte plafonné à 1,3', async () => {
    const r = await render(<Text>x</Text>);
    expect(r.root.findByType(RNText).props.maxFontSizeMultiplier).toBe(1.3);
  });

  it('le lien utilise le bleu actif : lisible en sombre', async () => {
    const light = await render(<Text color="link">x</Text>);
    expect(StyleSheet.flatten(light.root.findByType(RNText).props.style).color).toBe(
      lightColors.blueActive,
    );
    const dark = await render(<Text color="link">x</Text>, {mode: 'dark'});
    expect(StyleSheet.flatten(dark.root.findByType(RNText).props.style).color).toBe(
      darkColors.blueActive,
    );
    expect(darkColors.blueActive).toBe('#93C5FD');
  });

  it('une erreur de couleur : rouge sémantique du thème', async () => {
    const r = await render(<Text color="error">x</Text>, {mode: 'dark'});
    expect(StyleSheet.flatten(r.root.findByType(RNText).props.style).color).toBe('#F87171');
  });
});

describe('Button', () => {
  it.each(['light', 'dark'] as const)('rendu sans erreur (%s)', async mode => {
    for (const variant of ['primary', 'secondary', 'ghost'] as const) {
      const r = await render(<Button label="Valider" variant={variant} />, {mode});
      expect(textsOf(r)).toContain('Valider');
    }
  });

  it('appelle onPress', async () => {
    const onPress = jest.fn();
    const r = await render(<Button label="Valider" onPress={onPress} />);
    buttons(r)[0].props.onPress();
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('désactivé : onPress n\'est pas branché et l\'état est annoncé', async () => {
    const onPress = jest.fn();
    const r = await render(<Button label="Valider" onPress={onPress} disabled />);
    const node = buttons(r)[0];
    expect(node.props.onPress).toBeUndefined();
    expect(node.props.disabled).toBe(true);
    expect(node.props.accessibilityState).toEqual({disabled: true, busy: false});
    expect(onPress).not.toHaveBeenCalled();
  });

  it('en chargement : onPress n\'est pas branché, état occupé, libellé masqué', async () => {
    const onPress = jest.fn();
    const r = await render(<Button label="Valider" onPress={onPress} loading />);
    const node = buttons(r)[0];
    expect(node.props.onPress).toBeUndefined();
    expect(node.props.accessibilityState).toEqual({disabled: true, busy: true});
    expect(textsOf(r)).not.toContain('Valider');
  });

  it('zone tactile d\'au moins 48 dp, rôle bouton, libellé d\'accessibilité', async () => {
    const r = await render(<Button label="Valider" accessibilityLabel="Valider le paiement" />);
    const node = buttons(r)[0];
    expect(pressableStyle(node).minHeight).toBeGreaterThanOrEqual(48);
    expect(node.props.accessibilityRole).toBe('button');
    expect(node.props.accessibilityLabel).toBe('Valider le paiement');
  });

  it('couleurs du thème : primaire bleu, secondaire sur surface alternative', async () => {
    const primary = await render(<Button label="a" />);
    expect(pressableStyle(buttons(primary)[0]).backgroundColor).toBe(
      lightColors.bluePrimary,
    );
    const secondary = await render(<Button label="a" variant="secondary" />, {mode: 'dark'});
    const style = pressableStyle(buttons(secondary)[0]);
    expect(style.backgroundColor).toBe(darkColors.bgSurfaceAlt);
    expect(style.borderColor).toBe(darkColors.borderLight);
  });

  it('appui visible', async () => {
    const r = await render(<Button label="a" />);
    const node = buttons(r)[0];
    expect(pressableStyle(node, true).opacity).toBeLessThan(1);
    expect(pressableStyle(node, false).opacity).toBe(1);
  });

  it('le texte du bouton est en Manrope, jamais Fraunces', async () => {
    const r = await render(<Button label="Valider" />);
    expect(familiesOf(r).every(family => family.startsWith('Manrope'))).toBe(true);
  });
});

describe('Card', () => {
  it.each([
    ['default', lightColors.bgSurface, lightColors.borderLight],
    ['accent', lightColors.goldLight, lightColors.goldBorder],
    ['glass', 'rgba(255, 255, 255, 0.86)', 'rgba(255, 255, 255, 0.55)'],
  ] as const)('variante %s (clair)', async (variant, bg, border) => {
    const r = await render(
      <Card variant={variant} testID="card">
        <Text>x</Text>
      </Card>,
    );
    const style = StyleSheet.flatten(host(r, 'card').props.style);
    expect(style.backgroundColor).toBe(bg);
    expect(style.borderColor).toBe(border);
    expect(style.borderRadius).toBe(16);
    expect(style.elevation).toBe(2);
  });

  it('variante accent (sombre) : or à 16 %', async () => {
    const r = await render(<Card variant="accent" testID="card" />, {mode: 'dark'});
    const style = StyleSheet.flatten(host(r, 'card').props.style);
    expect(style.backgroundColor).toBe('rgba(212, 175, 55, 0.16)');
    expect(style.elevation).toBe(4);
  });

  it('sans marge intérieure si padded est faux', async () => {
    const r = await render(<Card padded={false} testID="card" />);
    expect(StyleSheet.flatten(host(r, 'card').props.style).padding).toBe(0);
  });
});

describe('TextField', () => {
  it('affiche le libellé, la valeur et l\'aide', async () => {
    const r = await render(
      <TextField label="Nom" value="Awa" onChangeText={() => {}} helper="Aide" testID="in" />,
    );
    expect(textsOf(r)).toEqual(expect.arrayContaining(['Nom', 'Aide']));
    expect(r.root.findByType(TextInput).props.value).toBe('Awa');
  });

  it('affiche l\'erreur à la place de l\'aide, en rouge du thème', async () => {
    const r = await render(
      <TextField
        label="Nom"
        value=""
        onChangeText={() => {}}
        helper="Aide"
        error="Invalide"
      />,
    );
    const texts = textsOf(r);
    expect(texts).toContain('Invalide');
    expect(texts).not.toContain('Aide');
  });

  it('transmet le texte saisi', async () => {
    const onChangeText = jest.fn();
    const r = await render(<TextField label="Nom" value="" onChangeText={onChangeText} />);
    r.root.findByType(TextInput).props.onChangeText('abc');
    expect(onChangeText).toHaveBeenCalledWith('abc');
  });

  it('désactivé : non éditable', async () => {
    const r = await render(<TextField label="Nom" value="x" onChangeText={() => {}} disabled />);
    expect(r.root.findByType(TextInput).props.editable).toBe(false);
  });

  it('mot de passe : masqué, le bouton œil affiche puis masque', async () => {
    const r = await render(
      <TextField
        label="Mot de passe"
        value="secret"
        onChangeText={() => {}}
        secure
        showPasswordLabel="Afficher"
        hidePasswordLabel="Masquer"
      />,
    );
    expect(r.root.findByType(TextInput).props.secureTextEntry).toBe(true);
    const toggle = buttons(r)[0];
    expect(toggle.props.accessibilityLabel).toBe('Afficher');
    await act(async () => toggle.props.onPress());
    expect(r.root.findByType(TextInput).props.secureTextEntry).toBe(false);
    expect(buttons(r)[0].props.accessibilityLabel).toBe('Masquer');
  });

  it('sans option mot de passe : pas de bouton œil', async () => {
    const r = await render(<TextField label="Nom" value="" onChangeText={() => {}} />);
    expect(buttons(r)).toHaveLength(0);
    expect(r.root.findByType(TextInput).props.secureTextEntry).toBe(false);
  });

  it('hauteur minimale 48 dp, police Manrope uniquement', async () => {
    const r = await render(
      <TextField label="Nom" value="x" onChangeText={() => {}} error="e" helper="h" />,
    );
    const input = StyleSheet.flatten(r.root.findByType(TextInput).props.style);
    expect(input.fontFamily).toBe('Manrope-Regular');
    expect(input.fontSize).toBe(16);
    expect(familiesOf(r).every(family => family.startsWith('Manrope'))).toBe(true);
    const row = r.root
      .findAllByType(View)
      .find(node => StyleSheet.flatten(node.props.style)?.minHeight === 48);
    expect(row).toBeDefined();
  });

  it('bordure : erreur rouge, sinon bordure du thème', async () => {
    const ok = await render(<TextField label="a" value="" onChangeText={() => {}} />, {mode: 'dark'});
    const bordered = (r: ReactTestRenderer) =>
      r.root
        .findAllByType(View)
        .map(node => StyleSheet.flatten(node.props.style))
        .find(style => style?.borderWidth === 1);
    expect(bordered(ok)?.borderColor).toBe(darkColors.borderLight);
    const bad = await render(<TextField label="a" value="" onChangeText={() => {}} error="e" />, {
      mode: 'dark',
    });
    expect(bordered(bad)?.borderColor).toBe(darkColors.error);
  });
});

describe('LoadingState', () => {
  it('annonce le chargement et n\'affiche aucun texte', async () => {
    const r = await render(<LoadingState accessibilityLabel="Chargement en cours" testID="ld" />);
    const node = host(r, 'ld');
    expect(node.props.accessibilityRole).toBe('progressbar');
    expect(node.props.accessibilityLabel).toBe('Chargement en cours');
    expect(node.props.accessibilityState).toEqual({busy: true});
    expect(textsOf(r)).toEqual([]);
  });

  it('fill : occupe tout l\'espace ; sinon marge verticale', async () => {
    const full = await render(<LoadingState accessibilityLabel="x" testID="ld" fill />);
    expect(StyleSheet.flatten(host(full, 'ld').props.style).flex).toBe(1);
    const small = await render(<LoadingState accessibilityLabel="x" testID="ld2" />);
    expect(StyleSheet.flatten(host(small, 'ld2').props.style).paddingVertical).toBe(32);
  });

  it('contient le logo animé', async () => {
    const r = await render(<LoadingState accessibilityLabel="x" />);
    expect(r.root.findAllByType(Image).length).toBeGreaterThan(0);
  });
});

describe('BrandLoader', () => {
  const loop = {start: jest.fn(), stop: jest.fn(), reset: jest.fn()};

  beforeEach(() => {
    loop.start.mockClear();
    loop.stop.mockClear();
    jest.spyOn(Animated, 'loop').mockReturnValue(loop as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('proportions du logo et 3 lettres animées D, S, I', async () => {
    const r = await render(<BrandLoader width={196} testID="bl" />);
    const root = StyleSheet.flatten(host(r, 'bl').props.style);
    expect(root.width).toBe(196);
    expect(root.height).toBe(Math.round(196 / (784 / 484)));
    for (const key of ['d', 's', 'i']) {
      expect(host(r, `bl-${key}`)).toBeDefined();
    }
  });

  it('lance la boucle puis l\'arrête au démontage', async () => {
    const r = await render(<BrandLoader testID="bl" />);
    expect(loop.start).toHaveBeenCalledTimes(1);
    mounted.splice(mounted.indexOf(r), 1);
    await act(async () => r.unmount());
    expect(loop.stop).toHaveBeenCalledTimes(1);
  });

  it('réduire les animations : logo fixe, aucune boucle', async () => {
    const r = await render(<BrandLoader testID="bl" />, {reduceMotion: true});
    expect(loop.start).not.toHaveBeenCalled();
    expect(r.root.findAll(n => n.props.testID === 'bl-d')).toHaveLength(0);
    expect(r.root.findAllByType(Image).length).toBeGreaterThan(0);
  });

  it('thème sombre : texte du logo en version claire', async () => {
    const light = await render(<BrandLoader testID="bl" />);
    const dark = await render(<BrandLoader testID="bl" />, {mode: 'dark'});
    const sources = (r: ReactTestRenderer) =>
      r.root.findAllByType(Image).map(n => n.props.source);
    expect(sources(light)).not.toEqual(sources(dark));
  });
});

describe('EmptyState', () => {
  it('affiche titre et message, sans icône par défaut', async () => {
    const r = await render(<EmptyState title="Vide" message="Rien ici" />);
    expect(textsOf(r)).toEqual(expect.arrayContaining(['Vide', 'Rien ici']));
    expect(r.root.findAllByType(Svg)).toHaveLength(0);
    expect(buttons(r)).toHaveLength(0);
  });

  it('icône facultative', async () => {
    const r = await render(<EmptyState message="Rien" icon="SearchIcon" />);
    expect(r.root.findAllByType(Svg)).toHaveLength(1);
  });

  it('bouton d\'action', async () => {
    const onAction = jest.fn();
    const r = await render(<EmptyState message="Rien" actionLabel="Explorer" onAction={onAction} />);
    expect(textsOf(r)).toContain('Explorer');
    buttons(r)[0].props.onPress();
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('pas de bouton si l\'action manque', async () => {
    const r = await render(<EmptyState message="Rien" actionLabel="Explorer" />);
    expect(buttons(r)).toHaveLength(0);
  });
});

describe('ErrorState', () => {
  it('affiche le message avec l\'icône d\'avertissement et le rôle alerte', async () => {
    const r = await render(<ErrorState title="Oups" message="Échec" testID="err" />);
    expect(textsOf(r)).toEqual(expect.arrayContaining(['Oups', 'Échec']));
    expect(r.root.findAllByType(Svg)).toHaveLength(1);
    expect(host(r, 'err').props.accessibilityRole).toBe('alert');
  });

  it('le bouton réessayer appelle son action', async () => {
    const onRetry = jest.fn();
    const r = await render(<ErrorState message="Échec" retryLabel="Réessayer" onRetry={onRetry} />);
    expect(textsOf(r)).toContain('Réessayer');
    buttons(r)[0].props.onPress();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('pas de bouton sans action', async () => {
    const r = await render(<ErrorState message="Échec" />);
    expect(buttons(r)).toHaveLength(0);
  });
});

describe('thème sombre : rendu de tous les composants sans erreur', () => {
  it('assemble les composants', async () => {
    const r = await render(
      <Card>
        <Text variant="title">T</Text>
        <Button label="B" />
        <TextField label="L" value="" onChangeText={() => {}} secure showPasswordLabel="a" hidePasswordLabel="b" />
        <LoadingState accessibilityLabel="c" />
        <EmptyState message="m" icon="BellIcon" />
        <ErrorState message="m" />
      </Card>,
      {mode: 'dark'},
    );
    expect(r.toJSON()).not.toBeNull();
  });
});
