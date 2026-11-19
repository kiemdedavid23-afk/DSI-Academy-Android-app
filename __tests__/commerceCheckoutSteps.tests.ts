import fr from '../src/shared/i18n/locales/fr.json';
import en from '../src/shared/i18n/locales/en.json';

const KEYS = [
  'progress', 'back', 'close', 'secure', 'summaryTitle', 'total', 'deliveryNote', 'continue',
  'methodTitle', 'methodIntro', 'methodFree', 'dsiName', 'balanceNow', 'balanceAfter',
  'balanceMissing', 'balanceLoading', 'balanceError', 'balanceRetry', 'mobileMoney', 'transfer', 'soon', 'pay',
];

describe('feuilles du parcours d\'achat', () => {
  it.each([
    ['fr', fr],
    ['en', en],
  ])('%s : tous les textes du Récapitulatif et du Moyen de paiement existent', (_l, json) => {
    const c = (json as any).mp.checkout;
    KEYS.forEach(k => expect(typeof c[k]).toBe('string'));
    expect(typeof (json as any).mp.pd.instant).toBe('string');
    expect(typeof (json as any).mp.pd.secure).toBe('string');
  });
});
