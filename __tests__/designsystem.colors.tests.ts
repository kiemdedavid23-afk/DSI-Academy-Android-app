/**
 * Couleurs : chaque valeur est comparée à docs/DESIGN-TOKENS.md (§1 à §5)
 * et à global.css du site. Un test qui ne compare aucune valeur n'est pas un test.
 */

import {
  darkColors,
  lightColors,
  withAlpha,
  type ColorTokens,
} from '@shared/designsystem/theme/colors';

describe('couleurs : thème clair (§1, §3, §4, §5)', () => {
  it.each([
    ['bgApp', '#F8FAFC'],
    ['bgSurface', '#FFFFFF'],
    ['bgSurfaceAlt', '#F1F5F9'],
    ['bgDarkPremium', '#0F172A'],
    ['bgDarkCard', '#1E293B'],
    ['textPrimary', '#0F172A'],
    ['textSecondary', '#475569'],
    ['textMuted', '#94A3B8'],
    ['textOnDark', '#F8FAFC'],
    ['goldPrestige', '#D4AF37'],
    ['goldLight', '#FDF6E2'],
    ['goldBorder', 'rgba(212, 175, 55, 0.35)'],
    ['bluePrimary', '#1E40AF'],
    ['blueLight', '#EFF6FF'],
    ['blueActive', '#1E40AF'],
    ['borderLight', '#E2E8F0'],
    ['error', '#B91C1C'],
    ['errorBg', '#FEF2F2'],
    ['errorBorder', '#FCA5A5'],
    ['success', '#15803D'],
    ['successBg', '#DCFCE7'],
    ['successBorder', '#86EFAC'],
    ['warning', '#B45309'],
    ['warningBg', '#FEF3C7'],
    ['warningBorder', '#FDE68A'],
    ['info', '#2563EB'],
    ['infoBg', '#DBEAFE'],
    ['infoBorder', '#93C5FD'],
  ] as [keyof ColorTokens, string][])('%s = %s', (key, expected) => {
    expect(lightColors[key]).toBe(expected);
  });
});

describe('couleurs : thème sombre (§2, §3, §5)', () => {
  it.each([
    ['bgApp', '#0B1120'],
    ['bgSurface', '#111827'],
    ['bgSurfaceAlt', '#1E293B'],
    ['bgDarkPremium', '#020617'],
    ['bgDarkCard', '#0F172A'],
    ['textPrimary', '#F8FAFC'],
    ['textSecondary', '#CBD5E1'],
    ['textMuted', '#94A3B8'],
    ['textOnDark', '#F8FAFC'],
    ['goldPrestige', '#D4AF37'],
    ['goldLight', 'rgba(212, 175, 55, 0.16)'],
    ['goldBorder', 'rgba(212, 175, 55, 0.35)'],
    ['bluePrimary', '#1E40AF'],
    ['blueLight', '#1E3A5F'],
    ['blueActive', '#93C5FD'],
    ['borderLight', '#334155'],
    ['error', '#F87171'],
    ['success', '#4ADE80'],
    ['warning', '#FBBF24'],
    ['info', '#93C5FD'],
  ] as [keyof ColorTokens, string][])('%s = %s', (key, expected) => {
    expect(darkColors[key]).toBe(expected);
  });

  it('fonds sémantiques à 16 % et bordures à 35 % de la couleur du texte', () => {
    expect(darkColors.errorBg).toBe('rgba(248, 113, 113, 0.16)');
    expect(darkColors.errorBorder).toBe('rgba(248, 113, 113, 0.35)');
    expect(darkColors.successBg).toBe('rgba(74, 222, 128, 0.16)');
    expect(darkColors.successBorder).toBe('rgba(74, 222, 128, 0.35)');
    expect(darkColors.warningBg).toBe('rgba(251, 191, 36, 0.16)');
    expect(darkColors.warningBorder).toBe('rgba(251, 191, 36, 0.35)');
    expect(darkColors.infoBg).toBe('rgba(147, 197, 253, 0.16)');
    expect(darkColors.infoBorder).toBe('rgba(147, 197, 253, 0.35)');
  });
});

describe('couleurs : cohérence', () => {
  it('les deux jeux ont exactement les mêmes clés', () => {
    expect(Object.keys(darkColors).sort()).toEqual(Object.keys(lightColors).sort());
  });

  it('chaque valeur est une couleur #RRGGBB ou rgba()', () => {
    const valid = /^(#[0-9A-Fa-f]{6}|rgba\(\d{1,3}, \d{1,3}, \d{1,3}, (0|1|0?\.\d+)\))$/;
    for (const set of [lightColors, darkColors]) {
      for (const [key, value] of Object.entries(set)) {
        expect([key, valid.test(value)]).toEqual([key, true]);
      }
    }
  });

  it('squelettes : valeurs de Skeleton.css du site', () => {
    expect(lightColors.skeletonBase).toBe('rgba(15, 23, 42, 0.09)');
    expect(lightColors.skeletonShine).toBe('rgba(212, 175, 55, 0.32)');
    expect(darkColors.skeletonBase).toBe('rgba(248, 250, 252, 0.1)');
    expect(darkColors.skeletonShine).toBe('rgba(212, 175, 55, 0.26)');
    expect(lightColors.skeletonBaseOnDark).toBe('rgba(255, 255, 255, 0.2)');
    expect(lightColors.skeletonShineOnDark).toBe('rgba(245, 215, 120, 0.45)');
  });
});

describe('withAlpha', () => {
  it('convertit #RRGGBB en rgba', () => {
    expect(withAlpha('#D4AF37', 0.35)).toBe('rgba(212, 175, 55, 0.35)');
    expect(withAlpha('#000000', 0)).toBe('rgba(0, 0, 0, 0)');
    expect(withAlpha('#ffffff', 1)).toBe('rgba(255, 255, 255, 1)');
  });

  it('refuse une couleur mal formée', () => {
    expect(() => withAlpha('#FFF', 0.5)).toThrow();
    expect(() => withAlpha('red', 0.5)).toThrow();
    expect(() => withAlpha('#GGGGGG', 0.5)).toThrow();
  });

  it('refuse un alpha hors de 0 à 1', () => {
    expect(() => withAlpha('#000000', -0.1)).toThrow();
    expect(() => withAlpha('#000000', 1.1)).toThrow();
    expect(() => withAlpha('#000000', Number.NaN)).toThrow();
  });
});
