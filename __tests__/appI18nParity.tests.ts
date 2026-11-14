import appFr from '@shared/i18n/locales/app.fr.json';
import appEn from '@shared/i18n/locales/app.en.json';

function keysOf(obj: unknown, prefix = ''): string[] {
  if (obj === null || typeof obj !== 'object') {
    return [prefix];
  }
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    keysOf(v, prefix ? `${prefix}.${k}` : k),
  );
}

describe('app i18n parity', () => {
  it('mêmes clés fr/en', () => {
    const fr = keysOf(appFr).sort();
    const en = keysOf(appEn).sort();
    expect(fr).toEqual(en);
  });
});
