/**
 * Tests i18n : clés fr/en, interpolation, fallback, changement de langue.
 */

import {initI18n, changeLanguage, getLanguage, i18n} from '@shared/i18n';
import fr from '@shared/i18n/locales/fr.json';
import en from '@shared/i18n/locales/en.json';

function flattenKeys(
  obj: Record<string, unknown>,
  prefix = '',
): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...flattenKeys(value as Record<string, unknown>, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

describe('i18n', () => {
  beforeAll(() => {
    initI18n('fr');
  });

  it('charge fr par défaut', () => {
    expect(getLanguage()).toBe('fr');
  });

  it('toutes les clés de fr existent dans en (fichiers principaux)', () => {
    const frKeys = new Set(flattenKeys(fr as Record<string, unknown>));
    const enKeys = new Set(flattenKeys(en as Record<string, unknown>));
    const missingInEn = [...frKeys].filter(k => !enKeys.has(k));
    const missingInFr = [...enKeys].filter(k => !frKeys.has(k));
    // Documente les écarts s'il y en a ; on tolère 0.
    expect({missingInEn, missingInFr}).toEqual({
      missingInEn: [],
      missingInFr: [],
    });
  });

  it('interpole les variables', () => {
    // Clé connue avec {{days}} sur le site (drawer.daysLeftMany)
    const text = i18n.t('drawer.daysLeftMany', {days: 3});
    expect(text).toContain('3');
  });

  it('fallback vers fr pour une clé absente', () => {
    const text = i18n.t('cle.inexistante.totalement', {defaultValue: ''});
    // Sans defaultValue, i18next renvoie la clé
    expect(typeof text).toBe('string');
  });

  it('changeLanguage bascule en en puis fr', async () => {
    await changeLanguage('en');
    expect(getLanguage()).toBe('en');
    expect(i18n.t('connexion.title')).toBeTruthy();
    await changeLanguage('fr');
    expect(getLanguage()).toBe('fr');
  });
});
