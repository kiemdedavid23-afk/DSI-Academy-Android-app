import {formatOrderDate} from '../src/features/commerce/logic/purchases';

describe('formatOrderDate', () => {
  const ts = new Date(2026, 10, 16, 12, 0, 0).getTime();
  it('français : 16 novembre 2026', () => {
    expect(formatOrderDate(ts, 'fr')).toBe('16 novembre 2026');
    expect(formatOrderDate(ts, 'fr-FR')).toBe('16 novembre 2026');
  });
  it('anglais : November 16, 2026', () => {
    expect(formatOrderDate(ts, 'en')).toBe('November 16, 2026');
  });
});
