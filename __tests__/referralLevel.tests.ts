import {referralLevel} from '../src/core/utils/referralLevel';

describe('referralLevel', () => {
  it.each([
    [0, 'explorateur'],
    [4, 'explorateur'],
    [5, 'contributeur'],
    [19, 'contributeur'],
    [20, 'batisseur'],
    [49, 'batisseur'],
    [50, 'leader'],
    [99, 'leader'],
    [100, 'referent'],
    [249, 'referent'],
    [250, 'ambassadeur'],
    [499, 'ambassadeur'],
    [500, 'pilier_dsi'],
    [999, 'pilier_dsi'],
  ])('actifs %i → %s', (n, level) => {
    expect(referralLevel(n).level).toBe(level);
  });
});
