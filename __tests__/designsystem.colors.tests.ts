// __tests__/designsystem.colors.tests.ts
import { lightColors, darkColors, withAlpha } from '@shared/designsystem/theme/colors';

describe('colors', () => {
  it('mêmes clés light/dark', () => {
    expect(Object.keys(lightColors).sort()).toEqual(Object.keys(darkColors).sort());
  });
  it('withAlpha limites', () => {
    expect(withAlpha('#000000', 0)).toContain('0)');
    expect(withAlpha('#FFFFFF', 1)).toContain('1)');
  });
});