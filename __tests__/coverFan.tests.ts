import {
  FAN_OVERLAP,
  FAN_RADIUS,
  FAN_SPAN,
  FAN_SPECS,
  MIX_SPECS,
  fanAngles,
  fanHeight,
  mixCovers,
  mixedHeight,
  placeFans,
  placeMixedFans,
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

describe('placeFans (demi-cercles)', () => {
  it('chaque éventail est un demi-cercle de -90° à +90°', () => {
    const p = placeFans('book', 8, 8);
    expect(FAN_SPAN).toBe(180);
    expect(p.top[0].angle).toBe(-90);
    expect(p.top[7].angle).toBe(90);
    expect(p.bottom[0].angle).toBe(-90);
    expect(p.bottom[7].angle).toBe(90);
  });
  it('arche du haut : bout extérieur en haut du bandeau, centre à y = rayon', () => {
    const s = FAN_SPECS.book;
    const c = placeFans('book', 8, 8).top[0];
    expect(c.top).toBe(0);
    expect(c.origin).toBe(`${s.w / 2}px ${FAN_RADIUS}px`);
  });
  it('cuvette du bas : bout extérieur en bas, centre remonté du chevauchement', () => {
    const s = FAN_SPECS.book;
    const c = placeFans('book', 8, 8).bottom[0];
    expect(c.top + s.h).toBe(FAN_RADIUS - FAN_OVERLAP + FAN_RADIUS);
    expect(c.top + s.h).toBe(fanHeight('book'));
  });
  it('éventail du haut par-dessus celui du bas, centrale au-dessus', () => {
    const p = placeFans('book', 8, 8);
    expect(Math.min(...p.top.map(c => c.z))).toBeGreaterThan(Math.max(...p.bottom.map(c => c.z)));
    expect(p.top[3].z).toBeGreaterThan(p.top[0].z);
  });
  it('plus bas que l\'ancienne illustration carrée (331 dp), pour toutes les maisons', () => {
    (['book', 'audio', 'video', 'course'] as const).forEach(k => {
      expect(fanHeight(k)).toBeLessThan(331);
    });
    expect(fanHeight()).toBe(2 * FAN_RADIUS - FAN_OVERLAP);
  });
});

describe('mixCovers (accueil Academy)', () => {
  it('alterne les maisons et respecte le total', () => {
    const lists = [['a1', 'a2', 'a3'], ['b1', 'b2'], ['c1'], []];
    expect(mixCovers(lists, 16)).toEqual(['a1', 'b1', 'c1', 'a2', 'b2', 'a3']);
    expect(mixCovers(lists, 4)).toEqual(['a1', 'b1', 'c1', 'a2']);
    expect(mixCovers([], 16)).toEqual([]);
  });
  it('stable : même entrée, même sortie', () => {
    const lists = [[1, 2], [3, 4]];
    expect(mixCovers(lists, 16)).toEqual(mixCovers(lists, 16));
  });
});

describe('placeMixedFans', () => {
  const kinds = ['book', 'video', 'course', 'audio'] as const;
  it('bouts extérieurs sur le même cercle malgré les formats différents', () => {
    const p = placeMixedFans([...kinds], [...kinds]);
    p.top.forEach(c => expect(c.top).toBe(0));
    p.bottom.forEach(c => expect(c.top + MIX_SPECS[c.kind].h).toBe(mixedHeight()));
  });
  it('haut par-dessus le bas', () => {
    const p = placeMixedFans(['book', 'book', 'book'], ['audio', 'audio', 'audio']);
    expect(Math.min(...p.top.map(c => c.z))).toBeGreaterThan(Math.max(...p.bottom.map(c => c.z)));
  });
  it('hauteur sous l\'ancienne illustration', () => {
    expect(mixedHeight()).toBeLessThan(331);
  });
});
