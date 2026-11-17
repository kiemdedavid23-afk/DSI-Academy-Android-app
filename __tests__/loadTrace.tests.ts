import {formatSeconds, loadTrace} from '@core/media/loadTrace';

describe('loadTrace', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(1000);
  });
  afterEach(() => jest.useRealTimers());

  it('enregistre la durée de chaque étape puis le bilan', () => {
    const seen: number[] = [];
    const off = loadTrace.onFinish(s => seen.push(s.steps.length));
    loadTrace.begin('pdf');
    jest.setSystemTime(1800);
    loadTrace.step('open');
    jest.setSystemTime(4200);
    loadTrace.finish();
    const s = loadTrace.get();
    expect(s.steps).toEqual([{id: 'link', ms: 800}, {id: 'open', ms: 2400}]);
    expect(s.finishedAt).toBe(4200);
    expect(s.failed).toBe(false);
    expect(seen).toEqual([2]);
    off();
  });
  it('finish est unique et `only` respecte l\'étape en cours', () => {
    loadTrace.begin('player');
    loadTrace.finish(false, 'buffer');
    expect(loadTrace.get().finishedAt).toBeNull();
    loadTrace.finish(true);
    const first = loadTrace.get();
    loadTrace.finish();
    expect(loadTrace.get()).toBe(first);
    expect(first.failed).toBe(true);
  });
  it('formatSeconds', () => expect(formatSeconds(2450)).toBe('2.5 s'));
});

describe('loadTrace.setProgress', () => {
  it('borne le pourcentage, le remet à zéro à chaque étape et ignore hors chargement', () => {
    loadTrace.begin('pdf');
    loadTrace.setProgress(42.4);
    expect(loadTrace.get().progress).toBe(42);
    loadTrace.setProgress(180);
    expect(loadTrace.get().progress).toBe(100);
    loadTrace.step('render');
    expect(loadTrace.get().progress).toBeNull();
    loadTrace.finish();
    loadTrace.setProgress(10);
    expect(loadTrace.get().progress).toBeNull();
  });
});
