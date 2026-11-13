/** Zone tactile minimale par élément cliquable (DESIGN-TOKENS §10). */
export const touch = {
  min: 48,
} as const;

export type Touch = typeof touch;
