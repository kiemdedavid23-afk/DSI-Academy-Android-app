import * as fs from 'fs';
import * as path from 'path';
import {EXPECTED_FONT_FILES, fontFamily} from '@shared/designsystem/theme/fonts';
import {typography} from '@shared/designsystem/theme/typography';

describe('polices embarquées', () => {
  it('la liste attendue est celle de DESIGN-TOKENS §6', () => {
    expect([...EXPECTED_FONT_FILES].sort()).toEqual(
      [
        'Fraunces-Regular.ttf',
        'Fraunces-Medium.ttf',
        'Fraunces-SemiBold.ttf',
        'Fraunces-Bold.ttf',
        'Fraunces-Italic.ttf',
        'Fraunces-MediumItalic.ttf',
        'Fraunces-SemiBoldItalic.ttf',
        'Manrope-Regular.ttf',
        'Manrope-Medium.ttf',
        'Manrope-SemiBold.ttf',
        'Manrope-Bold.ttf',
        'Manrope-ExtraBold.ttf',
        'IBMPlexMono-Medium.ttf',
      ].sort(),
    );
  });

  it('chaque fichier attendu est produit par scripts/fetch-fonts.py', () => {
    const script = fs.readFileSync(
      path.join(__dirname, '..', 'scripts', 'fetch-fonts.py'),
      'utf8',
    );
    for (const file of EXPECTED_FONT_FILES) {
      const name = file.replace('.ttf', '');
      expect([name, script.includes(`"${name}"`)]).toEqual([name, true]);
    }
  });

  it('fontFamily retourne le nom de fichier sans extension', () => {
    expect(fontFamily('sans', '400')).toBe('Manrope-Regular');
    expect(fontFamily('sans', '800')).toBe('Manrope-ExtraBold');
    expect(fontFamily('royal', '600')).toBe('Fraunces-SemiBold');
    expect(fontFamily('royal', '500', true)).toBe('Fraunces-MediumItalic');
    expect(fontFamily('mono', '500')).toBe('IBMPlexMono-Medium');
  });

  it('une coupe non embarquée lève une erreur (aucun repli silencieux)', () => {
    expect(() => fontFamily('royal', '800')).toThrow();
    expect(() => fontFamily('royal', '700', true)).toThrow();
    expect(() => fontFamily('mono', '400')).toThrow();
  });

  it('chaque rôle typographique a une coupe embarquée', () => {
    for (const [name, role] of Object.entries(typography)) {
      const family = fontFamily(role.family, role.weight);
      expect([name, `${family}.ttf`]).toEqual([
        name,
        expect.stringMatching(/\.ttf$/),
      ]);
      expect(EXPECTED_FONT_FILES).toContain(`${family}.ttf`);
    }
  });
});
