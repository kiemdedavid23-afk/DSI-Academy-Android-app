import {
  FAN_SPECS,
  fanAngles,
  fanHeight,
  placeFans,
  splitCovers,
  stackOrder,
} from '../src/features/content/logic/coverFan';

describe('fanAngles', () => {
  it('répartit de -span/2 à +span/2, symétrique', () => {
    expect(fanAngles(5, 80)).toEqual([-40, -20, 0, 20, 40]);
    expect(fanAngles(8, 70)[0]).toBe(-35);
    expect(fanAngles(8, 70)[7]).toBe(35);
  });
  it('cas limites : vide et un seul élément', () => {
    expect(fanAngles(0, 80)).toEqual([]);
    expect(fanAngles(1, 80)).toEqual([0]);
  });
});

describe('splitCovers', () => {
  it('16 → 8 en haut, 8 en bas ; impair : le haut garde le surplus', () => {
    const a = Array.from({length: 16}, (_, i) => i);
    expect(splitCovers(a).top).toHaveLength(8);
    expect(splitCovers(a).bottom).toHaveLength(8);
    expect(splitCovers([1, 2, 3]).top).toEqual([1, 2]);
    expect(splitCovers([1, 2, 3]).bottom).toEqual([3]);
    expect(splitCovers([])).toEqual({top: [], bottom: []});
  });
});

describe('stackOrder', () => {
  it('la couverture centrale est dessinée en dernier', () => {
    const order = stackOrder(fanAngles(5, 80));
    expect(order[order.length - 1]).toBe(2);
    expect(order.slice(0, 2).sort()).toEqual([0, 4]);
  });
});

describe('placeFans', () => {
  it('éventail du haut par-dessus celui du bas, points d\'attache imbriqués', () => {
    const p = placeFans('book', 8, 8);
    const s = FAN_SPECS.book;
    expect(Math.min(...p.top.map(c => c.z))).toBeGreaterThan(Math.max(...p.bottom.map(c => c.z)));
    // haut : cadre au-dessus du point d'attache (en bas du cadre)
    expect(p.top[0]).toMatchObject({top: 0, origin: '50% 100%'});
    // bas : cadre sous son point d'attache, remonté du chevauchement
    expect(p.bottom[0]).toMatchObject({top: s.h - s.overlap, origin: '50% 0%'});
    expect(p.top).toHaveLength(8);
    expect(p.bottom).toHaveLength(8);
  });
  it('hauteur totale : deux couvertures moins le chevauchement', () => {
    expect(fanHeight('book')).toBe(2 * 114 - 34);
    expect(fanHeight('video')).toBe(2 * 72 - 22);
  });
  it('plus bas que l\'ancienne illustration carrée (331 dp) pour toutes les maisons', () => {
    (['book', 'audio', 'video', 'course'] as const).forEach(k => {
      expect(fanHeight(k)).toBeLessThan(331);
    });
  });
});
