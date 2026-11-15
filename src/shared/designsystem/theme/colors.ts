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
  // --- L3 correctif : tokens des anciennes couleurs en dur de `features` ---
  // Carte membre : palette fixe, identique en clair et sombre (MemberCard.css du site)
  /** Début et fin du dégradé de la carte. */
  memberCardBgStart: string;
  /** Milieu du dégradé de la carte. */
  memberCardBgMid: string;
  /** Halo or, centre. */
  memberCardHaloStart: string;
  /** Halo or, bord (transparent). */
  memberCardHaloEnd: string;
  memberCardBorder: string;
  /** Marque « DSI ACADEMY » et langue. */
  memberCardAccent: string;
  memberCardChipBg: string;
  memberCardChipBorder: string;
  /** Texte clair crème : puce, initiales, valeurs. */
  memberCardText: string;
  memberCardName: string;
  memberCardMeta: string;
  memberCardAvatarBorder: string;
  memberCardAvatarBg: string;
  memberCardDivider: string;
  memberCardStatusOnBg: string;
  memberCardStatusOnBorder: string;
  memberCardStatusOnText: string;
  memberCardStatusOffBg: string;
  memberCardStatusOffBorder: string;
  memberCardStatusOffText: string;
  // Badges de notification (NotificationsPage.css)
  notifBadgeMaintenanceBg: string;
  notifBadgeMaintenanceText: string;
  notifBadgeUrgentBg: string;
  notifBadgeUrgentText: string;
  notifBadgeInfoBg: string;
  notifBadgeInfoText: string;
  notifBadgeDefaultBg: string;
  notifBadgeDefaultText: string;
  // Danger : texte, bordure, fond
  dangerText: string;
  dangerBorder: string;
  dangerBg: string;
  /** Bordure du panneau d'erreur plein écran. */
  dangerPanelBorder: string;
  dangerPanelTitle: string;
  dangerPanelText: string;
  dangerRipple: string;
  // Notifications / erreurs (CORRECTIF VISUEL)
  notifBlue: string;
  textSlate500: string;
  textSlate700: string;
  errorTitle: string;
  warningText: string;
  // Pastille d'état active
  /** Pastille active sur surface. */
  statusActiveBg: string;
  statusActiveBorder: string;
  statusActiveText: string;
  /** Pastille active sur fond sombre (bandeau profil). */
  statusActiveOnDarkBg: string;
  statusActiveOnDarkBorder: string;
  statusActiveOnDarkText: string;
  statusInactiveOnDarkBg: string;
  statusInactiveOnDarkBorder: string;
  // Interrupteur actif
  /** Pastille de l'interrupteur. */
  switchKnob: string;
  // Or : halos et bordures
  goldHalo12: string;
  goldHalo14: string;
  goldHalo18: string;
  goldHalo22: string;
  // Divers
  /** Texte sur fond bleu / bouton plein. */
  textOnPrimary: string;
  blueBorderSoft: string;
  /** Voile blanc 10 % sur fond sombre. */
  onDarkVeil10: string;
  /** Voile noir 20 % sur l'image de fond du shell. */
  shellScrim: string;
  /** Titre de la carte abonnement du tiroir, sur bleu. */
  drawerSubTitle: string;
  drawerSubFoot: string;
  drawerBarTrack: string;
  badgeActiveOnDarkText: string;
  badgeExpiredOnDarkBg: string;
  badgeExpiredOnDarkText: string;
  /** Fond de l'icône de pièce active, thème sombre. */
  drawerActiveIconBgDark: string;
  /** Texte du bouton or de la carte abonnement du tiroir. */
  drawerSubBtnText: string;
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

/**
 * Valeurs reprises telles quelles des couleurs qui étaient en dur dans
 * `features` (elles viennent du site). Identiques en clair et en sombre.
 */
const GOLD = '#D4AF37';
const CREAM = '#FDF6E2';
const FEATURE_TOKENS = {
  memberCardBgStart: '#0F172A',
  memberCardBgMid: '#1E293B',
  memberCardHaloStart: withAlpha(GOLD, 0.2),
  memberCardHaloEnd: withAlpha(GOLD, 0),
  memberCardBorder: withAlpha(GOLD, 0.35),
  memberCardAccent: GOLD,
  memberCardChipBg: withAlpha(GOLD, 0.15),
  memberCardChipBorder: withAlpha(GOLD, 0.35),
  memberCardText: CREAM,
  memberCardName: '#F8FAFC',
  memberCardMeta: withAlpha('#F8FAFC', 0.75),
  memberCardAvatarBorder: withAlpha(CREAM, 0.4),
  memberCardAvatarBg: withAlpha('#FFFFFF', 0.06),
  memberCardDivider: withAlpha('#FFFFFF', 0.1),
  memberCardStatusOnBg: withAlpha('#10B981', 0.2),
  memberCardStatusOnBorder: withAlpha('#10B981', 0.35),
  memberCardStatusOnText: '#6EE7B7',
  memberCardStatusOffBg: withAlpha('#94A3B8', 0.15),
  memberCardStatusOffBorder: withAlpha('#94A3B8', 0.3),
  memberCardStatusOffText: '#CBD5E1',

  notifBadgeMaintenanceBg: '#FEF3C7',
  notifBadgeMaintenanceText: '#92400E',
  notifBadgeUrgentBg: '#FEE2E2',
  notifBadgeUrgentText: '#991B1B',
  notifBadgeInfoBg: '#DBEAFE',
  notifBadgeInfoText: '#1E40AF',
  notifBadgeDefaultBg: '#F1F5F9',
  notifBadgeDefaultText: '#475569',

  dangerText: '#B91C1C',
  dangerBorder: withAlpha('#DC2626', 0.35),
  dangerBg: '#FEF2F2',
  dangerPanelBorder: '#FCA5A5',
  dangerPanelTitle: '#991B1B',
  dangerPanelText: '#B91C1C',
  dangerRipple: withAlpha('#DC2626', 0.08),

  notifBlue: '#2563EB',
  textSlate500: '#64748B',
  textSlate700: '#334155',
  errorTitle: '#991B1B',
  warningText: '#92400E',

  statusActiveBg: withAlpha('#22C55E', 0.14),
  statusActiveBorder: withAlpha('#22C55E', 0.3),
  statusActiveText: '#15803D',
  statusActiveOnDarkBg: withAlpha('#22C55E', 0.18),
  statusActiveOnDarkBorder: withAlpha('#22C55E', 0.4),
  statusActiveOnDarkText: '#86EFAC',
  statusInactiveOnDarkBg: withAlpha('#FFFFFF', 0.12),
  statusInactiveOnDarkBorder: withAlpha('#FFFFFF', 0.2),

  switchKnob: '#FFFFFF',

  goldHalo12: withAlpha(GOLD, 0.12),
  goldHalo14: withAlpha(GOLD, 0.14),
  goldHalo18: withAlpha(GOLD, 0.18),
  goldHalo22: withAlpha(GOLD, 0.22),

  textOnPrimary: '#FFFFFF',
  blueBorderSoft: withAlpha('#2563EB', 0.15),
  onDarkVeil10: withAlpha('#FFFFFF', 0.1),
  shellScrim: withAlpha('#000000', 0.2),
  drawerSubTitle: withAlpha('#FFFFFF', 0.9),
  drawerSubFoot: withAlpha('#FFFFFF', 0.78),
  drawerBarTrack: withAlpha('#FFFFFF', 0.22),
  badgeActiveOnDarkText: '#F5D778',
  badgeExpiredOnDarkBg: withAlpha('#F87171', 0.22),
  badgeExpiredOnDarkText: '#FCA5A5',
  drawerActiveIconBgDark: '#2563EB',
  drawerSubBtnText: '#0F172A',
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

  ...FEATURE_TOKENS,
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

  ...FEATURE_TOKENS,

  // Sombre : mêmes teintes, éclaircies pour rester lisibles sur fond sombre.
  textSlate500: '#94A3B8',
  textSlate700: '#CBD5E1',
  errorTitle: '#FCA5A5',
  warningText: '#FCD34D',
};
