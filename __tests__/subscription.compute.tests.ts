import {computeSubscription} from '@core/utils/subscription';
import {dsiToFcfa} from '@core/utils/dsi';

describe('computeSubscription', () => {
  const now = Date.parse('2026-11-14T12:00:00.000Z');

  it('none si dateFin absente', () => {
    expect(computeSubscription({}, now)).toEqual({state: 'none'});
    expect(computeSubscription(null, now)).toEqual({state: 'none'});
  });

  it('none si dateFin invalide', () => {
    expect(computeSubscription({dateFin: 'pas-une-date'}, now)).toEqual({
      state: 'none',
    });
  });

  it('expired si dateFin passée', () => {
    const r = computeSubscription(
      {dateFin: '2026-11-01T00:00:00.000Z', dateDebut: '2025-11-01T00:00:00.000Z'},
      now,
    );
    expect(r.state).toBe('expired');
  });

  it('active avec days et percent', () => {
    const r = computeSubscription(
      {
        dateDebut: '2026-11-14T10:00:00.000Z',
        dateFin: '2027-11-14T10:00:00.000Z',
      },
      now,
    );
    expect(r.state).toBe('active');
    if (r.state === 'active') {
      expect(r.days).toBeGreaterThan(300);
      expect(r.percent).toBeGreaterThan(0);
      expect(r.percent).toBeLessThanOrEqual(100);
    }
  });

  it('active percent 100 si dateDebut absente', () => {
    const r = computeSubscription(
      {dateFin: '2027-11-14T10:00:00.000Z'},
      now,
    );
    expect(r.state).toBe('active');
    if (r.state === 'active') {
      expect(r.percent).toBe(100);
    }
  });
});

describe('dsiToFcfa', () => {
  it('5000 DSI → 2000 FCFA', () => {
    expect(dsiToFcfa(5000)).toBe(2000);
  });
  it('non fini → 0', () => {
    expect(dsiToFcfa(Number.NaN)).toBe(0);
  });
});
