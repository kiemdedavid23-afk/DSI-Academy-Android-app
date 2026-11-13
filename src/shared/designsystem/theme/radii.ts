/** Rayons (DESIGN-TOKENS §7, R-DS-3). Toute autre valeur du site est ramenée à celle-ci. */
export const radii = {
  sm: 6,
  md: 10,
  lg: 16,
  /** Pilules, puces : arrondi complet. */
  pill: 9999,
  /** Avatars : rond complet (50 % côté web). */
  round: 9999,
} as const;

export type Radii = typeof radii;
