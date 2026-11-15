import {dsiToFcfa, withdrawalFees, withdrawalNet} from '../src/core/utils/dsi';

describe('dsiToFcfa integer', () => {
  it('5000 → 2000', () => expect(dsiToFcfa(5000)).toBe(2000));
  it('1001 → 400', () => expect(dsiToFcfa(1001)).toBe(400));
  it('0 → 0', () => expect(dsiToFcfa(0)).toBe(0));
});

describe('withdrawalFees', () => {
  it('2000 → 190', () => expect(withdrawalFees(2000)).toBe(190));
  it('400 → 118', () => expect(withdrawalFees(400)).toBe(118));
});

describe('withdrawalNet', () => {
  it('5000 → brut 2000 frais 190 net 1810', () => {
    expect(withdrawalNet(5000)).toEqual({brut: 2000, frais: 190, net: 1810});
  });
  it('1001 → 400 / 118 / 282', () => {
    expect(withdrawalNet(1001)).toEqual({brut: 400, frais: 118, net: 282});
  });
});
