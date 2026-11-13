import {
  ALLOWED_SIZES,
  BODY_LINE_RATIO,
  MAX_FONT_SIZE_MULTIPLIER,
  lineHeightPx,
  typography,
} from '@shared/designsystem/theme/typography';

describe('typographie (DESIGN-TOKENS §6)', () => {
  it('la liste des tailles autorisées est celle du document', () => {
    expect([...ALLOWED_SIZES]).toEqual([
      10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 24, 26, 32, 38,
    ]);
  });

  it('chaque rôle utilise une taille autorisée', () => {
    for (const [name, role] of Object.entries(typography)) {
      expect([name, (ALLOWED_SIZES as readonly number[]).includes(role.size)]).toEqual([
        name,
        true,
      ]);
    }
  });

  it('Fraunces n\'est jamais sous 14 sp', () => {
    const small = Object.entries(typography).filter(
      ([, role]) => role.family === 'royal' && role.size < 14,
    );
    expect(small).toEqual([]);
  });

  it('les rôles de formulaire et de bouton sont en Manrope', () => {
    expect(typography.button.family).toBe('sans');
    expect(typography.field.family).toBe('sans');
    expect(typography.label.family).toBe('sans');
  });

  it('le corps a un interligne de 1,5', () => {
    expect(BODY_LINE_RATIO).toBe(1.5);
    expect(typography.body.lineHeight).toBe(24);
    expect(typography.bodyStrong.lineHeight).toBe(24);
    expect(typography.bodySmall.lineHeight).toBe(21);
  });

  it('les interlignes sont des entiers en pixels, jamais un ratio', () => {
    for (const role of Object.values(typography)) {
      expect(Number.isInteger(role.lineHeight)).toBe(true);
      expect(role.lineHeight).toBeGreaterThanOrEqual(role.size);
    }
  });

  it('les grands chiffres et salutations du site : 38, 24', () => {
    expect(typography.bigNumber.size).toBe(38);
    expect(typography.greeting.size).toBe(24);
    expect(typography.title.size).toBe(26);
  });

  it('lineHeightPx arrondit', () => {
    expect(lineHeightPx(15, 1.5)).toBe(23);
    expect(lineHeightPx(13, 1.4)).toBe(18);
  });

  it('le plafond d\'agrandissement du texte est 1,3', () => {
    expect(MAX_FONT_SIZE_MULTIPLIER).toBe(1.3);
  });
});
