/**
 * Élévations Android (DESIGN-TOKENS §8). Valeurs de départ [À CONFIRMER sur appareil].
 * La couleur d'ombre n'est honorée qu'à partir d'Android 9 (API 28).
 */

export type ElevationTokens = {
  small: number;
  card: number;
  raised: number;
  shadowColor: string;
};

export const lightElevation: ElevationTokens = {
  small: 1,
  card: 2,
  raised: 6,
  shadowColor: '#0F172A',
};

export const darkElevation: ElevationTokens = {
  small: 1,
  card: 4,
  raised: 8,
  shadowColor: '#000000',
};
