jest.mock('@core/api/endpoints/marketplace/seller/seller.api', () => ({
  fetchSellerOrders: jest.fn(),
}));
jest.mock('@shared/store', () => ({storeRegistry: {register: () => undefined}}));

import {fetchSellerOrders} from '@core/api/endpoints/marketplace/seller/seller.api';
import {csvCell, ordersToCsv} from '../src/features/commerce/seller/logic/sellerOrders';
import {sellerOrders, sellerOrdersStore} from '../src/features/commerce/seller/store/sellerOrdersStore';
import commerceFr from '../src/shared/i18n/locales/commerce.fr.json';
import commerceEn from '../src/shared/i18n/locales/commerce.en.json';

const fetchOrders = fetchSellerOrders as jest.Mock;
const metric = {value: 0, previous: null, deltaPct: null, trend: 'flat'};
const summary = {revenueDsi: metric, netRevenueDsi: metric, paidOrders: metric, processingOrders: 0, failedOrders: 0};
const order = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  listingId: 'l',
  listingTitle: 'Guide',
  coverUrl: null,
  buyerDisplayName: 'Awa K.',
  buyerCountry: 'BF',
  priceDsi: 1000,
  commissionDsi: 100,
  feesDsi: 0,
  netSellerDsi: 900,
  status: 'paid',
  createdAt: Date.UTC(2026, 10, 18, 15, 2),
  ...extra,
});
const page = (items: unknown[], nextCursor: string | null) => ({
  kind: 'success',
  page: {period: {key: 'all', from: null, to: null}, summary, items, nextCursor},
});

beforeEach(() => {
  jest.clearAllMocks();
  sellerOrders.reset();
});

describe('ventes vendeur : CSV', () => {
  it('cellules : guillemets, virgules et formules', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('dit "oui"')).toBe('"dit ""oui"""');
    expect(csvCell('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(csvCell(null)).toBe('');
    expect(csvCell(-5)).toBe('-5');
  });
  it('colonnes du Worker, BOM, acheteur inconnu vide', () => {
    const csv = ordersToCsv([order('o1'), order('o2', {buyerDisplayName: null, buyerCountry: null}) as never] as never);
    const lines = csv.split('\n');
    expect(csv.startsWith('\uFEFForderId,createdAt,listingTitle,buyerDisplayName,buyerCountry,priceDsi,commissionDsi,feesDsi,netSellerDsi,status')).toBe(true);
    expect(lines[1]).toBe('o1,2026-11-18T15:02:00.000Z,Guide,Awa K.,BF,1000,100,0,900,paid');
    expect(lines[2]).toBe('o2,2026-11-18T15:02:00.000Z,Guide,,,1000,100,0,900,paid');
  });
});

describe('ventes vendeur : store', () => {
  it('période « all » par défaut, puis page suivante sans doublon', async () => {
    fetchOrders
      .mockResolvedValueOnce(page([order('a')], 'c1'))
      .mockResolvedValueOnce(page([order('a'), order('b')], null));
    await sellerOrders.load();
    expect(fetchOrders).toHaveBeenCalledWith({period: 'all', status: 'all'});
    await sellerOrders.loadMore();
    expect(sellerOrdersStore.getState().items.map(i => i.id)).toEqual(['a', 'b']);
  });
  it('changer de filtre relit la liste avec le statut', async () => {
    fetchOrders.mockResolvedValue(page([], null));
    await sellerOrders.setFilter('processing');
    expect(fetchOrders).toHaveBeenLastCalledWith({period: 'all', status: 'processing'});
  });
  it('échec : état erreur sans texte du Worker', async () => {
    fetchOrders.mockResolvedValueOnce({kind: 'failure', errorKind: 'network', status: 0, code: null});
    await sellerOrders.load();
    expect(sellerOrdersStore.getState()).toMatchObject({status: 'error', error: 'network'});
  });
  it('export : parcourt toutes les pages ; échec = null', async () => {
    fetchOrders
      .mockResolvedValueOnce(page([order('a')], 'c1'))
      .mockResolvedValueOnce(page([order('b')], null));
    const csv = await sellerOrders.exportCsv();
    expect(csv?.split('\n').filter(Boolean)).toHaveLength(3);
    expect(fetchOrders).toHaveBeenLastCalledWith({period: 'all', status: 'all', limit: 100, cursor: 'c1'});
    fetchOrders.mockResolvedValueOnce({kind: 'failure', errorKind: 'server', status: 500, code: null});
    expect(await sellerOrders.exportCsv()).toBeNull();
    expect(sellerOrdersStore.getState().exporting).toBe(false);
  });
});

describe('ventes vendeur : i18n', () => {
  const keys = (o: unknown, p = ''): string[] =>
    o && typeof o === 'object' ? Object.entries(o).flatMap(([k, v]) => keys(v, `${p}${k}.`)) : [p];
  it('parité fr / en', () => {
    expect(keys(commerceEn.commerce.sellerSpace.sales).sort()).toEqual(
      keys(commerceFr.commerce.sellerSpace.sales).sort(),
    );
  });
});
