/**
 * Couleurs du thème (DESIGN-TOKENS.md §1 à §5, global.css du site).
 * Seul fichier de l'app qui contient des codes couleur (R-DS-1).
 */

export type ColorTokens = {
  // Surfaces
  bgApp: string;
  bgSurface: string;
  bgSurfaceAlt: string;
  bgDarkPremium: string;
  bgDarkCard: string;
  // Textes
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textOnDark: string;
  // Or (rare : environ 5 % de l'écran)
  goldPrestige: string;
  goldLight: string;
  goldBorder: string;
  goldGradientEnd: string;
  /** Texte doré des phrases d'accueil / tags (MemberSpaceLayout --dsi-gold-text). */
  goldText: string;
  /** Or d'accueil membre (--home-gold). */
  homeGold: string;
  // Bleu
  bluePrimary: string;
  blueLight: string;
  /** Bleu « actif / lien » : lisible en clair comme en sombre (§3). */
  blueActive: string;
  // Royal title (dégradé impossible en RN → repli uni)
  /** Repli titre « DSI Academy » clair (MemberSpaceLayout --dsi-royal-start). */
  royalStart: string;
  /** Fin du dégradé royal (référence, non utilisée seule). */
  royalEnd: string;
  /** Titre « DSI Academy » en thème sombre. */
  titleOnDark: string;
  // Bordure
  borderLight: string;
  // Overlay tiroir
  overlay: string;
  // Badge abonnement accueil
  badgeNoneBg: string;
  badgeNoneText: string;
  badgeActiveText: string;
  badgeExpiredBg: string;
  badgeExpiredText: string;
  /** Déconnexion tiroir (MemberDrawer.css .logout) */
  logout: string;
  // Sémantiques (§5) : `error` est la couleur du texte
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
  // Squelettes (Skeleton.css du site)
  skeletonBase: string;
  skeletonShine: string;
  skeletonBaseOnDark: string;
  skeletonShineOnDark: string;
};

/** Couleur `#RRGGBB` avec transparence, au format `rgba(r, g, b, a)`. */
export function withAlpha(hex: string, alpha: number): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
    throw new Error(`withAlpha: couleur #RRGGBB attendue, reçu "${hex}"`);
  }
  if (!(alpha >= 0 && alpha <= 1)) {
    throw new Error(`withAlpha: alpha entre 0 et 1 attendu, reçu ${alpha}`);
  }
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Fond (16 %) et bordure (35 %) d'une couleur sémantique sombre, sur la surface. */
const SEMANTIC_BG_ALPHA = 0.16;
const SEMANTIC_BORDER_ALPHA = 0.35;

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
  goldGradientEnd: '#E8C77E',
  goldText: '#8c6a12',
  homeGold: '#8c6a12',

  bluePrimary: '#1E40AF',
  blueLight: '#EFF6FF',
  blueActive: '#1E40AF',

  royalStart: '#0a1b54',
  royalEnd: '#1d4ed8',
  titleOnDark: '#dbeafe',

  borderLight: '#E2E8F0',

  overlay: 'rgba(15, 23, 42, 0.45)',

  badgeNoneBg: '#e2e8f0',
  badgeNoneText: '#334155',
  badgeActiveText: '#6b4f00',
  badgeExpiredBg: '#fee2e2',
  badgeExpiredText: '#991b1b',
  logout: '#dc2626',

  error: '#B91C1C',
  errorBg: '#FEF2F2',
  errorBorder: '#FCA5A5',
  success: '#15803D',
  successBg: '#DCFCE7',
  successBorder: '#86EFAC',
  warning: '#B45309',
  warningBg: '#FEF3C7',
  warningBorder: '#FDE68A',
  info: '#2563EB',
  infoBg: '#DBEAFE',
  infoBorder: '#93C5FD',

  skeletonBase: withAlpha('#0F172A', 0.09),
  skeletonShine: withAlpha('#D4AF37', 0.32),
  skeletonBaseOnDark: withAlpha('#FFFFFF', 0.2),
  skeletonShineOnDark: withAlpha('#F5D778', 0.45),
};

export const darkColors: ColorTokens = {
  bgApp: '#0B1120',
  bgSurface: '#111827',
  bgSurfaceAlt: '#1E293B',
  bgDarkPremium: '#020617',
  bgDarkCard: '#0F172A',

  textPrimary: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',
  textOnDark: '#F8FAFC',

  goldPrestige: '#D4AF37',
  // Le site garde l'or clair crème en sombre : on ne le copie pas (DESIGN-TOKENS §2).
  goldLight: withAlpha('#D4AF37', SEMANTIC_BG_ALPHA),
  goldBorder: withAlpha('#D4AF37', 0.35),
  goldGradientEnd: '#E8C77E',
  goldText: '#D4AF37',
  homeGold: '#D4AF37',

  bluePrimary: '#1E40AF',
  blueLight: '#1E3A5F',
  blueActive: '#93C5FD',

  royalStart: '#0a1b54',
  royalEnd: '#1d4ed8',
  titleOnDark: '#dbeafe',

  borderLight: '#334155',

  overlay: 'rgba(15, 23, 42, 0.45)',

  badgeNoneBg: '#334155',
  badgeNoneText: '#CBD5E1',
  badgeActiveText: '#F5D778',
  badgeExpiredBg: withAlpha('#F87171', SEMANTIC_BG_ALPHA),
  badgeExpiredText: '#FCA5A5',
  logout: '#f87171',

  error: '#F87171',
  errorBg: withAlpha('#F87171', SEMANTIC_BG_ALPHA),
  errorBorder: withAlpha('#F87171', SEMANTIC_BORDER_ALPHA),
  success: '#4ADE80',
  successBg: withAlpha('#4ADE80', SEMANTIC_BG_ALPHA),
  successBorder: withAlpha('#4ADE80', SEMANTIC_BORDER_ALPHA),
  warning: '#FBBF24',
  warningBg: withAlpha('#FBBF24', SEMANTIC_BG_ALPHA),
  warningBorder: withAlpha('#FBBF24', SEMANTIC_BORDER_ALPHA),
  info: '#93C5FD',
  infoBg: withAlpha('#93C5FD', SEMANTIC_BG_ALPHA),
  infoBorder: withAlpha('#93C5FD', SEMANTIC_BORDER_ALPHA),

  skeletonBase: withAlpha('#F8FAFC', 0.1),
  skeletonShine: withAlpha('#D4AF37', 0.26),
  skeletonBaseOnDark: withAlpha('#FFFFFF', 0.2),
  skeletonShineOnDark: withAlpha('#F5D778', 0.45),
};
