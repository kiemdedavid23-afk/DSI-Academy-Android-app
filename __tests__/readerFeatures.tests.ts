import {SLEEP_OPTIONS, SPEEDS, SPEED_OPTIONS, nextSpeed} from '@core/media/playerNative';
import {
  FONT_MAX,
  FONT_MIN,
  sanitizeLook,
} from '../src/features/content/store/readerLookStore';

describe('lecteurs : vitesses et minuteur', () => {
  it('propose les vitesses du site, de 0,5 à 2×', () => {
    expect([...SPEED_OPTIONS]).toEqual([0.5, 0.75, 1, 1.25, 1.5, 2]);
  });

  it('garde le bouton cyclique de l\'app inchangé', () => {
    expect(SPEEDS[0]).toBe(1);
    expect(nextSpeed(1)).toBe(1.25);
  });

  it('propose les durées du minuteur de sommeil du site', () => {
    expect([...SLEEP_OPTIONS]).toEqual([5, 10, 15, 30, 60]);
  });
});

describe('préférences de lecture', () => {
  it('prend les valeurs par défaut quand rien n\'est valide', () => {
    expect(sanitizeLook(null)).toEqual({theme: 'light', family: 'serif', fontPercent: 100});
    expect(sanitizeLook({theme: 'rose', family: 'comic', fontPercent: 'x'})).toEqual({
      theme: 'light',
      family: 'serif',
      fontPercent: 100,
    });
  });

  it('borne la taille de 80 % à 200 % par pas de 10', () => {
    expect(sanitizeLook({fontPercent: 10}).fontPercent).toBe(FONT_MIN);
    expect(sanitizeLook({fontPercent: 999}).fontPercent).toBe(FONT_MAX);
    expect(sanitizeLook({fontPercent: 123}).fontPercent).toBe(120);
  });

  it('garde un thème et une police valides', () => {
    expect(sanitizeLook({theme: 'night', family: 'sans'})).toMatchObject({theme: 'night', family: 'sans'});
  });
});
