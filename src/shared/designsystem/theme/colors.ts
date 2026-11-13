// src/shared/designsystem/theme/colors.ts
// Valeurs exactes de global.css + DESIGN-TOKENS (à confirmer si le document apporte des précisions).

export type ColorTokens = {
  bgApp: string;
  bgSurface: string;
  bgSurfaceAlt: string;
  bgDarkPremium: string;
  bgDarkCard: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textOnDark: string;
  goldPrestige: string;
  goldLight: string;
  goldBorder: string;
  bluePrimary: string;
  blueLight: string;
  borderLight: string;
  error: string;
  errorBg: string;
  errorBorder: string;
  success: string;
  successBg: string;
  successBorder: string;
  warning: string;
  warningBg: string;
  warningBorder: string;
  info: string;
  infoBg: string;
  infoBorder: string;
};

const withAlpha = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const lightColors: ColorTokens = {
  bgApp: '#F8FAFC',
  bgSurface: '#FFFFFF',
  bgSurfaceAlt: '#F1F5F9',
  bgDarkPremium: '#0F172A',
  bgDarkCard: '#1E293B',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textOnDark: '#F8FAFC',
  goldPrestige: '#D4AF37',
  goldLight: '#FDF6E2',
  goldBorder: withAlpha('#D4AF37', 0.35),
  bluePrimary: '#1E40AF',
  blueLight: '#EFF6FF',
  borderLight: '#E2E8F0',
  error: '#DC2626',
  errorBg: withAlpha('#DC2626', 0.16),
  errorBorder: withAlpha('#DC2626', 0.35),
  success: '#16A34A',
  successBg: withAlpha('#16A34A', 0.16),
  successBorder: withAlpha('#16A34A', 0.35),
  warning: '#D97706',
  warningBg: withAlpha('#D97706', 0.16),
  warningBorder: withAlpha('#D97706', 0.35),
  info: '#2563EB',
  infoBg: withAlpha('#2563EB', 0.16),
  infoBorder: withAlpha('#2563EB', 0.35),
};

export const darkColors: ColorTokens = {
  ...lightColors,
  bgApp: '#0F172A',
  bgSurface: '#1E293B',
  bgSurfaceAlt: '#334155',
  textPrimary: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',
  goldLight: withAlpha('#D4AF37', 0.16),
  goldBorder: withAlpha('#D4AF37', 0.35),
  // Autres ajustements sombres selon DESIGN-TOKENS si nécessaire
};

export { withAlpha };