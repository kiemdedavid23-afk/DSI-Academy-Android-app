/**
 * Liste pays (site getCountryList) — données statiques.
 * Hermes : pas de reliance sur Intl.DisplayNames.
 */

export type CountryEntry = {
  code: string;
  nameFr: string;
  nameEn: string;
};

/** Sous-ensemble Afrique de l'Ouest / Centrale aligné Worker WhatsApp. */
export const COUNTRIES: readonly CountryEntry[] = [
  {code: 'BF', nameFr: 'Burkina Faso', nameEn: 'Burkina Faso'},
  {code: 'BJ', nameFr: 'Bénin', nameEn: 'Benin'},
  {code: 'CI', nameFr: "Côte d'Ivoire", nameEn: 'Côte d’Ivoire'},
  {code: 'ML', nameFr: 'Mali', nameEn: 'Mali'},
  {code: 'NE', nameFr: 'Niger', nameEn: 'Niger'},
  {code: 'SN', nameFr: 'Sénégal', nameEn: 'Senegal'},
  {code: 'TG', nameFr: 'Togo', nameEn: 'Togo'},
  {code: 'GW', nameFr: 'Guinée-Bissau', nameEn: 'Guinea-Bissau'},
  {code: 'GN', nameFr: 'Guinée', nameEn: 'Guinea'},
  {code: 'CM', nameFr: 'Cameroun', nameEn: 'Cameroon'},
  {code: 'CF', nameFr: 'Centrafrique', nameEn: 'Central African Republic'},
  {code: 'CG', nameFr: 'Congo', nameEn: 'Congo'},
  {code: 'GA', nameFr: 'Gabon', nameEn: 'Gabon'},
  {code: 'TD', nameFr: 'Tchad', nameEn: 'Chad'},
  {code: 'CD', nameFr: 'RD Congo', nameEn: 'DR Congo'},
  {code: 'GH', nameFr: 'Ghana', nameEn: 'Ghana'},
  {code: 'KE', nameFr: 'Kenya', nameEn: 'Kenya'},
] as const;

export function countryLabel(
  code: string,
  lang: 'fr' | 'en',
): string {
  const c = COUNTRIES.find(x => x.code === code);
  if (!c) return code;
  return lang === 'en' ? c.nameEn : c.nameFr;
}

export function isKnownCountry(code: string): boolean {
  return COUNTRIES.some(c => c.code === code);
}
