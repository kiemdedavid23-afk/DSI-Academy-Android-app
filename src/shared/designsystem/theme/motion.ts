/**
 * Mouvement. Durées issues du site (Skeleton.css : reflet 1,6 s ; apparition 0,35 s).
 * Aucune animation ne doit tourner quand `reduceMotion` est vrai (DESIGN-TOKENS §12).
 */
export const motion = {
  skeletonSweepMs: 1600,
  fadeInMs: 350,
  /** Durée générique d'une transition d'appui (choix technique). */
  pressMs: 120,
} as const;

export type Motion = typeof motion;
