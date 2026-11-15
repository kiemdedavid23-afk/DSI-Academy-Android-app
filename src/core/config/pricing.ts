/**
 * Montants d'AFFICHAGE uniquement.
 * Le Worker reste seul juge des montants réellement crédités / débités.
 */

/** Affichage confirmation renouvellement (site pricing.js). */
export const RENEWAL_PRICE_DSI = 2500;

/**
 * Barème Worker des récompenses de parrainage actuelles (contrat §2.6).
 * N1 = 1000 DSI (400 FCFA), N2 = 250 DSI (100 FCFA).
 * Les 500 / 120 du pricing.js site sont périmés.
 * Équivalent FCFA via dsiToFcfa(), jamais en dur.
 */
export const REFERRAL_REWARD_N1_DSI = 1000;
export const REFERRAL_REWARD_N2_DSI = 250;
