import commerceFr from '../src/shared/i18n/locales/commerce.fr.json';
import commerceEn from '../src/shared/i18n/locales/commerce.en.json';
import {cartTotals} from '../src/features/commerce/logic/cart';
import type {CommerceProduct, ShopCartLine} from '../src/features/commerce/store/commerceTypes';

describe('codes promo Boutique', () => {
  it.each([
    ['fr', commerceFr],
    ['en', commerceEn],
  ])('%s : texte d\'introduction et textes de remise du panier', (_l, json) => {
    const c = (json as any).commerce;
    expect(typeof c.shell.codesIntro).toBe('string');
    ['promoLabel', 'promoApply', 'promoChecking', 'promoRemove', 'promoNote', 'promoValid', 'promoInvalid'].forEach(
      k => expect(typeof c.cart[k]).toBe('string'),
    );
  });
});

describe('totaux du panier (aperçu)', () => {
  const lines = [{productId: 'a', qty: 2}] as ShopCartLine[];
  const products = [{id: 'a', priceDsi: 100}] as CommerceProduct[];
  it('sans code : sous-total = total', () => {
    const t = cartTotals(lines, products, null);
    expect(t.subtotalDsi).toBe(200);
    expect(t.totalDsi).toBe(200);
    expect(t.discountDsi).toBeNull();
  });
  it('code en pourcentage : remise estimée', () => {
    const t = cartTotals(lines, products, {code: 'X', kind: 'percent', value: 10});
    expect(t.discountDsi).toBe(20);
    expect(t.totalDsi).toBe(180);
  });
});
