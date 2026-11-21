jest.mock('@core/api/endpoints/marketplace/seller/seller.api', () => ({
  fetchSellerOverview: jest.fn(),
}));
jest.mock('@shared/store', () => ({
  createResourceStore: (o: {fetcher: () => Promise<unknown>}) => ({fetcher: o.fetcher}),
  storeRegistry: {register: () => undefined},
}));

import {fetchSellerOverview} from '@core/api/endpoints/marketplace/seller/seller.api';
import {sellerColors} from '../src/shared/designsystem/theme/sellerTheme';
import {
  avatarInitial,
  formatFcfaFromDsi,
  metricDelta,
  overviewErrorKey,
} from '../src/features/commerce/seller/logic/sellerFormat';
import {sellerOverviewStore} from '../src/features/commerce/seller/store/sellerOverviewStore';
import commerceFr from '../src/shared/i18n/locales/commerce.fr.json';
import commerceEn from '../src/shared/i18n/locales/commerce.en.json';

const fetchOverview = fetchSellerOverview as jest.Mock;
const m = (deltaPct: number | null, trend: 'up' | 'down' | 'flat') => ({
  value: 10,
  previous: 5,
  deltaPct,
  trend,
});

describe('espace vendeur : couleurs (DESIGN-ESPACE-VENDEUR §2)', () => {
  it.each([
    ['statusBar', '#F59E0B'],
    ['bg', '#FFFFFF'],
    ['surfaceMuted', '#F1EEE9'],
    ['border', '#E6E2DB'],
    ['ink', '#111111'],
    ['inkMuted', '#5F5F5F'],
    ['accent', '#C2410C'],
    ['accentFrom', '#F97416'],
    ['accentTo', '#F59D0B'],
    ['tabInactive', '#767676'],
    ['positiveText', '#15803D'],
    ['positiveBg', '#ECFDF3'],
    ['positiveBadgeText', '#16A34A'],
    ['positiveBadgeBg', '#F0FDF4'],
    ['coverPeach', '#EFD3C1'],
    ['coverSky', '#D5E4EE'],
  ] as const)('%s = %s', (key, value) => {
    expect(sellerColors[key]).toBe(value);
  });
});

describe('espace vendeur : variation d’un indicateur', () => {
  it('hausse, baisse, stable', () => {
    expect(metricDelta(m(12.4, 'up'))).toEqual({kind: 'up', pct: 12});
    expect(metricDelta(m(-7.6, 'down'))).toEqual({kind: 'down', pct: 8});
    expect(metricDelta(m(0, 'flat'))).toEqual({kind: 'flat'});
    expect(metricDelta(m(0.2, 'up'))).toEqual({kind: 'flat'});
  });
  it('pas de période précédente : « Nouveau » seulement à la hausse', () => {
    expect(metricDelta(m(null, 'up'))).toEqual({kind: 'new'});
    expect(metricDelta(m(null, 'flat'))).toEqual({kind: 'none'});
    expect(metricDelta(m(null, 'down'))).toEqual({kind: 'none'});
  });
});

describe('espace vendeur : mises en forme', () => {
  it('DSI en FCFA entiers (2/5), groupés', () => {
    expect(formatFcfaFromDsi(0)).toBe('0');
    expect(formatFcfaFromDsi(1000)).toBe('400');
    expect(formatFcfaFromDsi(12_500)).toBe('5 000');
    expect(formatFcfaFromDsi(7)).toBe('2');
  });
  it('initiale de l’avatar', () => {
    expect(avatarInitial('  awa', 'Boutique')).toBe('A');
    expect(avatarInitial(null, 'boutique')).toBe('B');
    expect(avatarInitial(null, '')).toBe('·');
  });
  it('erreurs : clés i18n, jamais le texte du Worker', () => {
    expect(overviewErrorKey('CONFIG')).toBe('commerce.sellerSpace.overview.balanceUnavailable');
    expect(overviewErrorKey('network')).toBe('app.catalogue.errorNetwork');
    expect(overviewErrorKey('noProof')).toBe('mp.states.errorSession');
    expect(overviewErrorKey('forbidden')).toBe('commerce.sellerSpace.overview.forbidden');
    expect(overviewErrorKey('server')).toBe('app.catalogue.errorServer');
    expect(overviewErrorKey('whatever')).toBe('app.catalogue.errorGeneric');
    expect(overviewErrorKey(null)).toBe('app.catalogue.errorGeneric');
  });
});

describe('espace vendeur : store de l’aperçu', () => {
  const fetcher = (sellerOverviewStore as unknown as {fetcher: () => Promise<unknown>}).fetcher;

  it('charge l’aperçu sur 30 jours', async () => {
    fetchOverview.mockResolvedValue({kind: 'success', overview: {marker: 1}});
    expect(await fetcher()).toEqual({marker: 1});
    expect(fetchOverview).toHaveBeenCalledWith('30d');
  });

  it('503 CONFIG : erreur « CONFIG », aucune donnée partielle', async () => {
    fetchOverview.mockResolvedValue({kind: 'failure', errorKind: 'unavailable', status: 503, code: 'CONFIG'});
    let message = '';
    try {
      await fetcher();
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toBe('CONFIG');
  });

  it('autre échec : la nature de l’erreur', async () => {
    fetchOverview.mockResolvedValue({kind: 'failure', errorKind: 'network', status: null, code: null});
    let message = '';
    try {
      await fetcher();
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toBe('network');
  });
});

describe('espace vendeur : textes', () => {
  const walk = (o: Record<string, unknown>, p = ''): string[] =>
    Object.entries(o).flatMap(([k, v]) =>
      v && typeof v === 'object' ? walk(v as Record<string, unknown>, `${p}${k}.`) : [`${p}${k}`],
    );
  it('mêmes clés en français et en anglais', () => {
    const fr = walk((commerceFr as any).commerce.sellerSpace).sort();
    const en = walk((commerceEn as any).commerce.sellerSpace).sort();
    expect(fr).toEqual(en);
    expect(fr.length > 20).toBe(true);
  });
});
