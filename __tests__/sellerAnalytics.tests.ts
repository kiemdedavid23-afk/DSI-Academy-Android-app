jest.mock('@core/api/endpoints/marketplace/seller/seller.api', () => ({
  fetchSellerAnalytics: jest.fn(),
}));
jest.mock('@shared/store', () => ({storeRegistry: {register: () => undefined}}));

import {fetchSellerAnalytics} from '@core/api/endpoints/marketplace/seller/seller.api';
import {
  areaAttr,
  barRatio,
  chartPoints,
  deltaBadge,
  formatPercent,
  hasSeriesData,
  pointsAttr,
  seriesLabel,
} from '../src/features/commerce/seller/logic/sellerAnalytics';
import {sellerAnalytics, sellerAnalyticsStore} from '../src/features/commerce/seller/store/sellerAnalyticsStore';
import commerceFr from '../src/shared/i18n/locales/commerce.fr.json';
import commerceEn from '../src/shared/i18n/locales/commerce.en.json';

const fetchAnalytics = fetchSellerAnalytics as jest.Mock;
const analytics = {period: {key: '30d', from: null, to: null, granularity: 'day'}, kpis: {}, series: [], funnel: {}, topListings: [], byCountry: []};

beforeEach(() => {
  jest.clearAllMocks();
  sellerAnalytics.reset();
});

describe('analyses vendeur : mises en forme', () => {
  it('badge de variation', () => {
    expect(deltaBadge({deltaPct: 16.7, trend: 'up'}, 'fr', 'Nouveau')).toBe('+16,7 %');
    expect(deltaBadge({deltaPct: -4.25, trend: 'down'}, 'en', 'New')).toBe('−4.3 %');
    expect(deltaBadge({deltaPct: 0, trend: 'flat'}, 'fr', 'Nouveau')).toBe('0,0 %');
    expect(deltaBadge({deltaPct: null, trend: 'up'}, 'fr', 'Nouveau')).toBe('Nouveau');
    expect(deltaBadge({deltaPct: null, trend: 'flat'}, 'fr', 'Nouveau')).toBeNull();
  });
  it('pourcentage et étiquettes de série', () => {
    expect(formatPercent(7.5, 'fr')).toBe('7,5 %');
    expect(formatPercent(0, 'en')).toBe('0.0 %');
    expect(seriesLabel('2026-10-22')).toBe('22/10');
    expect(seriesLabel('2026-10')).toBe('10/2026');
    expect(seriesLabel('x')).toBe('x');
  });
  it('barres', () => {
    expect(barRatio(0, 10)).toBe(0);
    expect(barRatio(5, 10)).toBe(0.5);
    expect(barRatio(1, 1000)).toBe(0.02);
    expect(barRatio(50, 10)).toBe(1);
    expect(barRatio(3, 0)).toBe(0);
  });
});

describe('analyses vendeur : courbe', () => {
  it('points : minimum en bas, maximum en haut, marges respectées', () => {
    const p = chartPoints([0, 10, 5], 116, 100, 8);
    expect(p[0]).toEqual({x: 8, y: 92});
    expect(p[1]).toEqual({x: 58, y: 8});
    expect(p[2]).toEqual({x: 108, y: 50});
  });
  it('cas limites : vide, un point, tout à zéro, cadre trop petit', () => {
    expect(chartPoints([], 100, 100)).toEqual([]);
    expect(chartPoints([4], 100, 100)[0].x).toBe(50);
    expect(chartPoints([0, 0], 100, 100).every(p => p.y === 92)).toBe(true);
    expect(chartPoints([1, 2], 10, 100)).toEqual([]);
    expect(hasSeriesData([0, 0])).toBe(false);
    expect(hasSeriesData([0, 2])).toBe(true);
  });
  it('attributs svg', () => {
    const p = chartPoints([0, 10], 116, 100, 8);
    expect(pointsAttr(p)).toBe('8.0,92.0 108.0,8.0');
    expect(areaAttr(p, 100, 8)).toBe('8.0,92.0 8.0,92.0 108.0,8.0 108.0,92.0');
    expect(areaAttr([], 100)).toBe('');
  });
});

describe('analyses vendeur : store', () => {
  it('30 jours par défaut, puis changement de période', async () => {
    fetchAnalytics.mockResolvedValue({kind: 'success', analytics});
    await sellerAnalytics.load();
    expect(fetchAnalytics).toHaveBeenCalledWith('30d');
    await sellerAnalytics.setPeriod('12m');
    expect(fetchAnalytics).toHaveBeenLastCalledWith('12m');
    expect(sellerAnalyticsStore.getState()).toMatchObject({period: '12m', status: 'success'});
  });
  it('échec : état erreur sans texte du Worker', async () => {
    fetchAnalytics.mockResolvedValueOnce({kind: 'failure', errorKind: 'server', status: 500, code: null});
    await sellerAnalytics.load();
    expect(sellerAnalyticsStore.getState()).toMatchObject({status: 'error', error: 'server'});
  });
  it('réponse tardive d’une autre période ignorée', async () => {
    let late: (v: unknown) => void = () => undefined;
    fetchAnalytics.mockReturnValueOnce(new Promise(r => (late = r)));
    fetchAnalytics.mockResolvedValueOnce({kind: 'success', analytics: {...analytics, marker: 'new'}});
    const first = sellerAnalytics.load();
    await sellerAnalytics.setPeriod('7d');
    late({kind: 'success', analytics: {...analytics, marker: 'old'}});
    await first;
    expect((sellerAnalyticsStore.getState().data as unknown as {marker: string}).marker).toBe('new');
  });
});

describe('analyses vendeur : i18n', () => {
  const keys = (o: unknown, p = ''): string[] =>
    o && typeof o === 'object' ? Object.entries(o).flatMap(([k, v]) => keys(v, `${p}${k}.`)) : [p];
  it('parité fr / en', () => {
    expect(keys(commerceEn.commerce.sellerSpace.analytics).sort()).toEqual(
      keys(commerceFr.commerce.sellerSpace.analytics).sort(),
    );
  });
});
