/**
 * Drapeaux de fonctionnalité. Valeurs figées pour L0d.
 * Aucune dépendance réseau.
 */

export const featureFlags = {
  /** Écran d'accueil à deux boutons (R-NAV-3). Désactivé jusqu'à stabilisation. */
  welcomeScreen: false,
  /** Galerie de test du design system. Faux par défaut en production. */
  devGallery: false,
} as const;

export type FeatureFlags = typeof featureFlags;
