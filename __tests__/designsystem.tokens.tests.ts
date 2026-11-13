import {darkElevation, lightElevation} from '@shared/designsystem/theme/elevation';
import {darkGlass, lightGlass} from '@shared/designsystem/theme/glass';
import {motion} from '@shared/designsystem/theme/motion';
import {radii} from '@shared/designsystem/theme/radii';
import {spacing} from '@shared/designsystem/theme/spacing';
import {touch} from '@shared/designsystem/theme/touch';

describe('rayons (§7)', () => {
  it('6, 10, 16, pilule, rond', () => {
    expect(radii.sm).toBe(6);
    expect(radii.md).toBe(10);
    expect(radii.lg).toBe(16);
    expect(radii.pill).toBe(9999);
    expect(radii.round).toBe(9999);
    expect(Object.keys(radii).sort()).toEqual(['lg', 'md', 'pill', 'round', 'sm']);
  });
});

describe('espacements (§10)', () => {
  it('xs à xxxl', () => {
    expect(spacing).toEqual({xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32});
  });

  it('zone tactile minimale 48 dp', () => {
    expect(touch.min).toBe(48);
  });
});

describe('élévations (§8)', () => {
  it('clair : 1, 2, 6', () => {
    expect([lightElevation.small, lightElevation.card, lightElevation.raised]).toEqual([1, 2, 6]);
  });

  it('sombre : 1, 4, 8', () => {
    expect([darkElevation.small, darkElevation.card, darkElevation.raised]).toEqual([1, 4, 8]);
  });
});

describe('verre (§9)', () => {
  it('clair : blanc à 86 % et 55 %', () => {
    expect(lightGlass.bg).toBe('rgba(255, 255, 255, 0.86)');
    expect(lightGlass.border).toBe('rgba(255, 255, 255, 0.55)');
  });

  it('sombre : #0F172A à 78 % et #94A3B8 à 25 %', () => {
    expect(darkGlass.bg).toBe('rgba(15, 23, 42, 0.78)');
    expect(darkGlass.border).toBe('rgba(148, 163, 184, 0.25)');
  });
});

describe('mouvement', () => {
  it('durées du site (reflet 1,6 s, apparition 0,35 s)', () => {
    expect(motion.skeletonSweepMs).toBe(1600);
    expect(motion.fadeInMs).toBe(350);
  });
});
