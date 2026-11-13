import {
  BRAND_LOADER_CYCLE_MS,
  FADE_START_MS,
  LETTER_ORDER,
  LETTER_WINDOWS,
  letterFill,
  litOpacity,
} from '@shared/designsystem/components/brandLoaderTimeline';

describe('chronologie du loader de marque', () => {
  it('ordre D, puis S, puis I, sans chevauchement', () => {
    expect(LETTER_ORDER).toEqual(['d', 's', 'i']);
    expect(LETTER_WINDOWS.d.end).toBeLessThanOrEqual(LETTER_WINDOWS.s.start);
    expect(LETTER_WINDOWS.s.end).toBeLessThanOrEqual(LETTER_WINDOWS.i.start);
    expect(LETTER_WINDOWS.i.end).toBeLessThanOrEqual(FADE_START_MS);
    expect(FADE_START_MS).toBeLessThan(BRAND_LOADER_CYCLE_MS);
  });

  it('chaque lettre se remplit de 0 à 1 dans sa fenêtre', () => {
    expect(letterFill('d', 0)).toBe(0);
    expect(letterFill('d', 400)).toBeCloseTo(0.5);
    expect(letterFill('d', 800)).toBe(1);
    expect(letterFill('s', 700)).toBe(0);
    expect(letterFill('s', 1100)).toBeCloseTo(0.5);
    expect(letterFill('i', 1300)).toBe(0);
    expect(letterFill('i', 2000)).toBe(1);
  });

  it('le S ne commence qu\'après le D, le I qu\'après le S', () => {
    expect(letterFill('s', LETTER_WINDOWS.d.end - 1)).toBe(0);
    expect(letterFill('i', LETTER_WINDOWS.s.end - 1)).toBe(0);
  });

  it('opacité : pleine puis estompée en fin de boucle', () => {
    expect(litOpacity(0)).toBe(1);
    expect(litOpacity(FADE_START_MS)).toBe(1);
    expect(litOpacity((FADE_START_MS + BRAND_LOADER_CYCLE_MS) / 2)).toBeCloseTo(0.5);
    expect(litOpacity(BRAND_LOADER_CYCLE_MS)).toBe(0);
  });
});
