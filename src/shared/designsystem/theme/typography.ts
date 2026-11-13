// src/shared/designsystem/theme/typography.ts
// Tableau final selon règles de la fiche (tailles autorisées uniquement).

export const ALLOWED_SIZES = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 24, 26, 32, 38] as const;

export type FontFamily = 'royal' | 'sans' | 'mono';

export type TypographyRole = {
  family: FontFamily;
  size: number;
  weight: '400' | '500' | '600' | '700' | '800';
  lineHeight: number;
};

export const typographyRoles: Record<string, TypographyRole> = {
  display: { family: 'royal', size: 38, weight: '700', lineHeight: 1.2 },
  title: { family: 'royal', size: 26, weight: '600', lineHeight: 1.25 },
  heading: { family: 'royal', size: 22, weight: '600', lineHeight: 1.3 },
  subtitle: { family: 'royal', size: 18, weight: '500', lineHeight: 1.4 },
  greeting: { family: 'royal', size: 20, weight: '500', lineHeight: 1.4 },
  bigNumber: { family: 'royal', size: 24, weight: '700', lineHeight: 1.1 }, // ramené de 28
  body: { family: 'sans', size: 16, weight: '400', lineHeight: 1.5 },
  bodyStrong: { family: 'sans', size: 16, weight: '600', lineHeight: 1.5 },
  bodyMedium: { family: 'sans', size: 15, weight: '500', lineHeight: 1.5 },
  bodySmall: { family: 'sans', size: 14, weight: '400', lineHeight: 1.5 },
  bodySmallStrong: { family: 'sans', size: 14, weight: '600', lineHeight: 1.5 },
  label: { family: 'sans', size: 13, weight: '600', lineHeight: 1.4 },
  caption: { family: 'sans', size: 12, weight: '400', lineHeight: 1.4 },
  captionStrong: { family: 'sans', size: 12, weight: '700', lineHeight: 1.4 },
  micro: { family: 'sans', size: 11, weight: '600', lineHeight: 1.3 },
  overline: { family: 'sans', size: 10, weight: '700', lineHeight: 1.2 },
  mono: { family: 'mono', size: 12, weight: '500', lineHeight: 1.4 },
  button: { family: 'sans', size: 14, weight: '600', lineHeight: 1.2 },
  field: { family: 'sans', size: 15, weight: '400', lineHeight: 1.5 },
};