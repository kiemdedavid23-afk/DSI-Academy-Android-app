import {parseEnvelope} from '@core/network/envelope';
import type {EnvelopeResult} from '@core/network';
import {
  nextCountdown,
  receiptRows,
  redirectTarget,
  REDIRECT_SECONDS,
} from '../src/features/commerce/logic/purchaseResult';
import {mergeOrderState} from '../src/features/commerce/store/purchaseStores';
import {mapShopCheckout} from '../src/core/api/endpoints/shop/shop.mapper';
import {mapMarketplaceCreateOrder} from '../src/core/api/endpoints/marketplace/marketplace.mapper';
import type {CommerceOrderState} from '../src/core/api/endpoints/commerce/commerce.types';
import commerceFr from '../src/shared/i18n/locales/commerce.fr.json';
import commerceEn from '../src/shared/i18n/locales/commerce.en.json';

const base: CommerceOrderState = {
  orderId: 'shop_1',
  status: 'paid',
  rawStatus: 'paid',
  totalDsi: 1350,
  replay: false,
  note: null,
};

function env(status: number, body: unknown): EnvelopeResult {
  return parseEnvelope({
    status,
    ok: status >= 200 && status < 300,
    body,
    bodyKind: 'json',
  });
}

describe('redirectTarget', () => {
  it('Marketplace et Boutique (un produit) : le produit', () => {
    expect(redirectTarget('marketplace', false, true)).toBe('access');
    expect(redirectTarget('shop', false, true)).toBe('access');
  });
  it('Boutique, panier : la bibliothèque, sinon Mes achats', () => {
    expect(redirectTarget('shop', true, true)).toBe('library');
    expect(redirectTarget('shop', true, false)).toBe('purchases');
  });
});

describe('compte à rebours', () => {
  it('5 secondes, jamais sous zéro', () => {
    expect(REDIRECT_SECONDS).toBe(5);
    expect(nextCountdown(5)).toBe(4);
    expect(nextCountdown(0)).toBe(0);
  });
});

describe('receiptRows', () => {
  it('sans remise : numéro et total seulement', () => {
    expect(receiptRows(base).map(r => r.id)).toEqual(['orderId', 'total']);
  });
  it('avec remise et code : sous-total, remise négative, code, total', () => {
    const rows = receiptRows({
      ...base,
      operationId: 'boutique_finop_1',
      subtotalDsi: 1500,
      discountDsi: 150,
      promoCode: 'PROMO10',
    });
    expect(rows.map(r => r.id)).toEqual([
      'orderId', 'operationId', 'subtotal', 'discount', 'promo', 'total',
    ]);
    expect(rows.find(r => r.id === 'discount')).toMatchObject({value: 150, negative: true});
  });
  it('Marketplace : la référence de paiement est affichée', () => {
    expect(receiptRows({...base, paymentRef: 'pay_9'}).map(r => r.id)).toContain('paymentRef');
  });
});

describe('données du Worker conservées', () => {
  it('Boutique : sous-total, remise, code et opération', () => {
    const r = mapShopCheckout(
      env(200, {
        success: true,
        data: {
          orderId: 'shop_1', status: 'paid', subtotalDsi: 1500, discountDsi: 150,
          totalDsi: 1350, promoCode: 'PROMO10', financialOperationId: 'boutique_finop_1', replay: false,
        },
      }),
    );
    expect(r.kind === 'success' && r.order).toMatchObject({
      subtotalDsi: 1500, discountDsi: 150, promoCode: 'PROMO10', operationId: 'boutique_finop_1',
    });
  });
  it('Marketplace : référence de paiement', () => {
    const r = mapMarketplaceCreateOrder(
      env(200, {
        success: true,
        data: {orderId: 'mp_1', status: 'paid', priceDsi: 100, paymentRef: 'pay_9', financialStatus: 'COMPLETED'},
      }),
    );
    expect(r.kind === 'success' && r.order.paymentRef).toBe('pay_9');
  });
  it('une relecture garde les données du premier retour', () => {
    const first = {...base, status: 'processing' as const, subtotalDsi: 1500, discountDsi: 150, promoCode: 'P', operationId: 'op'};
    const merged = mergeOrderState(first, {...base, totalDsi: null, subtotalDsi: null, discountDsi: null, promoCode: null, operationId: null});
    expect(merged).toMatchObject({status: 'paid', totalDsi: 1350, subtotalDsi: 1500, discountDsi: 150, promoCode: 'P', operationId: 'op'});
  });
});

describe('textes de l\'achat', () => {
  it.each([
    ['fr', commerceFr],
    ['en', commerceEn],
  ])('%s : reçu, redirection et attente', (_l, json) => {
    const p = (json as any).commerce.purchase;
    ['doNotClose', 'autoChecking', 'stayHere'].forEach(k => expect(typeof p[k]).toBe('string'));
    ['orderId', 'paymentRef', 'operationId', 'subtotal', 'discount', 'promo', 'total'].forEach(k =>
      expect(typeof p.receipt[k]).toBe('string'),
    );
    ['access', 'library', 'purchases'].forEach(k => {
      expect(p.redirect[k]).toContain('{{count}}');
    });
  });
});
