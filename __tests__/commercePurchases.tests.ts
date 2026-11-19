import {orderTitle, ordersFor, statusTone} from '../src/features/commerce/logic/purchases';
import {PURCHASES_TABS} from '../src/features/commerce/logic/commerceSections';
import type {CommerceOrder} from '../src/features/commerce/store/commerceTypes';
import commerceFr from '../src/shared/i18n/locales/commerce.fr.json';
import commerceEn from '../src/shared/i18n/locales/commerce.en.json';

function o(id: string, status: CommerceOrder['status'], titles: string[] = []): CommerceOrder {
  return {
    id,
    status,
    items: titles.map((title, i) => ({productId: `p${i}`, title, qty: 1})),
  } as unknown as CommerceOrder;
}

const orders = [o('1', 'paid'), o('2', 'processing'), o('3', 'failed'), o('4', 'refunded')];

describe('ordersFor', () => {
  it('Mes achats : payées et en attente de paiement', () => {
    expect(ordersFor('purchases', orders).map(x => x.id)).toEqual(['1', '2']);
  });
  it('Historique : toutes les commandes, dans l\'ordre reçu', () => {
    expect(ordersFor('history', orders).map(x => x.id)).toEqual(['1', '2', '3', '4']);
  });
});

describe('statusTone', () => {
  it('payé vert, en attente jaune, échoué rouge, remboursé neutre', () => {
    expect(statusTone('paid')).toBe('success');
    expect(statusTone('processing')).toBe('warning');
    expect(statusTone('failed')).toBe('danger');
    expect(statusTone('refunded')).toBe('neutral');
  });
});

describe('orderTitle', () => {
  it('premier produit et nombre des suivants', () => {
    expect(orderTitle(o('1', 'paid', ['A', 'B', 'C']))).toEqual({title: 'A', more: 2});
  });
  it('commande sans produit lisible', () => {
    expect(orderTitle(o('1', 'paid'))).toEqual({title: null, more: 0});
  });
});

describe('sous-onglets de Mes achats', () => {
  it.each([
    ['fr', commerceFr],
    ['en', commerceEn],
  ])('%s : un libellé par sous-onglet et les textes de l\'historique', (_l, json) => {
    const shell = (json as any).commerce.shell;
    PURCHASES_TABS.forEach(id => expect(typeof shell.tabs[id]).toBe('string'));
    ['codesSoon', 'historyEmptyTitle', 'historyEmptyHint'].forEach(k =>
      expect(typeof shell[k]).toBe('string'),
    );
  });
});
