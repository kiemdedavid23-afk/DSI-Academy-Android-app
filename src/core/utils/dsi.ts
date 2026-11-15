/**
 * Conversions DSI → FCFA en arithmétique entière (contrat Worker).
 * FCFA brut = floor(DSI × 2 / 5). Ne pas utiliser de flottants.
 */

/** FCFA brut = floor(n × 2 / 5). */
export function dsiToFcfa(dsi: number): number {
  if (!Number.isFinite(dsi) || dsi <= 0) {
    return 0;
  }
  const n = Math.floor(dsi);
  return Math.floor((n * 2) / 5);
}

/**
 * Frais de retrait : min(brut, 100 + ceil(brut × 450 / 10000)).
 * Constantes : fixe 100, taux 450/10000 (contrat §2.9).
 */
export function withdrawalFees(brutFcfa: number): number {
  if (!Number.isFinite(brutFcfa) || brutFcfa <= 0) {
    return 0;
  }
  const brut = Math.floor(brutFcfa);
  const variable = Math.ceil((brut * 450) / 10000);
  const fees = 100 + variable;
  return fees > brut ? brut : fees;
}

export type WithdrawalEstimate = {
  brut: number;
  frais: number;
  net: number;
};

export function withdrawalNet(dsi: number): WithdrawalEstimate {
  const brut = dsiToFcfa(dsi);
  const frais = withdrawalFees(brut);
  const net = brut - frais;
  return {brut, frais, net};
}
