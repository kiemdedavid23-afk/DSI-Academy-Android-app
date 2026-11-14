/**
 * Conversions DSI (contrat Worker : 1 DSI = 0,4 FCFA).
 */

/** Entier FCFA = DSI × 0,4 (arrondi au plus proche). */
export function dsiToFcfa(dsi: number): number {
  if (!Number.isFinite(dsi)) {
    return 0;
  }
  return Math.round(dsi * 0.4);
}
