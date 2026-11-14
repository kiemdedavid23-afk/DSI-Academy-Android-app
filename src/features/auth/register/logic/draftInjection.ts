/**
 * Construction du script d'injection du brouillon dsi_inscription_draft
 * (même forme que ConnexionScreen.jsx côté site).
 * Exécuté une seule fois, uniquement si l'URL de démarrage est hôte site.
 */

import type {PaymentMode} from '@core/session';

export type DraftPayload = {
  userId: string;
  paymentTrackingToken: string;
  paymentUrl: string | null;
  paymentMode: PaymentMode;
  etape: 'confirmation' | 'paiement';
};

export function buildDraftPayload(input: {
  userId: string;
  paymentTrackingToken: string;
  paymentUrl: string | null;
  paymentMode: PaymentMode;
}): DraftPayload {
  const mode = input.paymentMode === 'direct' ? 'direct' : 'hosted';
  return {
    userId: input.userId,
    paymentTrackingToken: input.paymentTrackingToken,
    paymentUrl: mode === 'direct' ? null : input.paymentUrl,
    paymentMode: mode,
    etape: mode === 'direct' ? 'confirmation' : 'paiement',
  };
}

/**
 * Script injecté avant le contenu. Se termine par `true;` (exigence WebView).
 * Valeurs échappées via JSON.stringify.
 */
export function buildDraftInjectionScript(payload: DraftPayload): string {
  const json = JSON.stringify(payload);
  // JSON.stringify produit une chaîne sûre à injecter dans du JS.
  return `(function(){try{localStorage.setItem('dsi_inscription_draft',${JSON.stringify(
    json,
  )});}catch(e){}})();true;`;
}
