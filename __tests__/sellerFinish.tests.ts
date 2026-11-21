/**
 * Lot S9 (finition) : thème sombre, accessibilité, parité des textes. Contrôles
 * sur les valeurs de la palette et sur le code source de l'espace vendeur, pour
 * qu'une régression soit attrapée par la CI.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  sellerColors,
  sellerColorsFor,
  sellerDarkColors,
  sellerMetrics,
  type SellerColors,
} from '../src/shared/designsystem/theme/sellerTheme';
import commerceFr from '../src/shared/i18n/locales/commerce.fr.json';
import commerceEn from '../src/shared/i18n/locales/commerce.en.json';

const ROOT = path.join(__dirname, '..', 'src', 'features', 'commerce', 'seller');

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap(e => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? sourceFiles(p) : /\.tsx?$/.test(e.name) ? [p] : [];
  });
}
const FILES = sourceFiles(ROOT);
const read = (f: string) => fs.readFileSync(f, 'utf8');
const rel = (f: string) => path.relative(ROOT, f);

// ─── Contrastes WCAG ─────────────────────────────────────────────────────

function luminance(hex: string): number {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = c.map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Paires (texte, fond) qui portent du texte de lecture : AA = 4,5. */
const TEXT_PAIRS: Array<[keyof SellerColors, keyof SellerColors]> = [
  ['ink', 'bg'],
  ['inkMuted', 'bg'],
  ['inkMuted', 'surfaceMuted'],
  ['accent', 'bg'],
  ['tabInactive', 'bg'],
  ['positiveText', 'bg'],
  ['positiveText', 'positiveBadgeBg'],
  ['negativeText', 'bg'],
  ['negativeText', 'negativeBg'],
  ['onDark', 'balanceBg'],
  ['inkOnDarkMuted', 'balanceBg'],
  ['ink', 'coverPeach'],
  ['ink', 'coverSky'],
];

describe('thème sombre : palette', () => {
  it('mêmes rôles que le thème clair, valeurs hexadécimales', () => {
    expect(Object.keys(sellerDarkColors).sort()).toEqual(Object.keys(sellerColors).sort());
    for (const v of Object.values(sellerDarkColors)) {
      expect(v).toMatch(/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/);
    }
  });
  it('la palette suit le thème', () => {
    expect(sellerColorsFor(false)).toBe(sellerColors);
    expect(sellerColorsFor(true)).toBe(sellerDarkColors);
    expect(sellerDarkColors.bg).not.toBe(sellerColors.bg);
  });
  it('le thème clair garde les valeurs des captures', () => {
    expect(sellerColors.bg).toBe('#FFFFFF');
    expect(sellerColors.balanceBg).toBe('#111111');
  });
  it.each(['light', 'dark'] as const)('contrastes AA du texte (%s)', mode => {
    const p = mode === 'dark' ? sellerDarkColors : sellerColors;
    for (const [fg, bg] of TEXT_PAIRS) {
      expect({pair: `${fg}/${bg}`, ratio: contrast(p[fg], p[bg]) >= 4.5}).toEqual({
        pair: `${fg}/${bg}`,
        ratio: true,
      });
    }
  });
  it('le voile des feuilles est translucide dans les deux thèmes', () => {
    expect(sellerColors.scrim).toHaveLength(9);
    expect(sellerDarkColors.scrim).toHaveLength(9);
  });
});

describe('espace vendeur : code source', () => {
  it('aucune couleur en dur dans features/ (R-DS-1)', () => {
    const hits = FILES.filter(f => /#[0-9A-Fa-f]{3,8}\b/.test(read(f))).map(rel);
    expect(hits).toEqual([]);
  });
  it('toute lecture de la palette passe par useSellerColors()', () => {
    const bad = FILES.filter(f => {
      const s = read(f);
      return /\bsellerColors\./.test(s) && !s.includes('useSellerColors()');
    }).map(rel);
    expect(bad).toEqual([]);
  });
  it('aucun import direct de la palette claire', () => {
    const bad = FILES.filter(f =>
      /import\s*\{[^}]*\bsellerColors\b[^}]*\}\s*from/.test(read(f)),
    ).map(rel);
    expect(bad).toEqual([]);
  });
  it('chaque Pressable a un rôle d’accessibilité', () => {
    const bad: string[] = [];
    for (const f of FILES.filter(x => x.endsWith('.tsx'))) {
      const s = read(f);
      for (const m of s.matchAll(/<Pressable\b/g)) {
        const tag = s.slice(m.index, m.index + 700).split(/(?<!=)>/, 1)[0];
        if (!tag.includes('accessibilityRole')) {
          bad.push(`${rel(f)}:${s.slice(0, m.index).split('\n').length}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });
  it('cibles tactiles d’au moins 44 dp', () => {
    expect(sellerMetrics.pillHeight).toBeGreaterThanOrEqual(44);
    expect(sellerMetrics.roundButton).toBeGreaterThanOrEqual(44);
    const small: string[] = [];
    for (const f of FILES) {
      for (const m of read(f).matchAll(/minHeight: (\d+)/g)) {
        if (Number(m[1]) < 44) {
          small.push(`${rel(f)}: minHeight ${m[1]}`);
        }
      }
    }
    expect(small).toEqual([]);
  });
});

// ─── Parité et existence des textes ──────────────────────────────────────

type Tree = {[k: string]: Tree | string};
function merge(a: Tree, b: Tree): Tree {
  for (const [k, v] of Object.entries(b)) {
    const cur = a[k];
    a[k] = typeof v === 'object' && typeof cur === 'object' ? merge(cur, v) : v;
  }
  return a;
}
function locale(lang: 'fr' | 'en'): Tree {
  const dir = path.join(__dirname, '..', 'src', 'shared', 'i18n', 'locales');
  return ['', 'app.', 'commerce.', 'community.', 'communityProfile.'].reduce<Tree>(
    (acc, p) => merge(acc, JSON.parse(fs.readFileSync(path.join(dir, `${p}${lang}.json`), 'utf8'))),
    {},
  );
}
const LOCALES = {fr: locale('fr'), en: locale('en')};
function has(tree: Tree, key: string): boolean {
  let cur: Tree | string = tree;
  for (const part of key.split('.')) {
    if (typeof cur !== 'object' || !(part in cur)) {
      return false;
    }
    cur = cur[part];
  }
  return true;
}
const exists = (lang: 'fr' | 'en', key: string) =>
  has(LOCALES[lang], key) || has(LOCALES[lang], `${key}_other`);

function flatKeys(o: unknown, p = ''): string[] {
  return o && typeof o === 'object'
    ? Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => flatKeys(v, p ? `${p}.${k}` : k))
    : [p];
}

describe('textes de l’espace vendeur', () => {
  it('commerce : mêmes clés en français et en anglais', () => {
    expect(flatKeys(commerceEn).sort()).toEqual(flatKeys(commerceFr).sort());
  });
  it('chaque clé écrite dans le code existe en fr et en en', () => {
    const missing: string[] = [];
    let checked = 0;
    for (const f of FILES) {
      const s = read(f);
      const consts = Object.fromEntries(
        [...s.matchAll(/const (\w) = '([^']+)'/g)].map(m => [m[1], m[2]]),
      );
      const keys: string[] = [];
      for (const m of s.matchAll(/\bt\(\s*(?:'([^']+)'|`([^`]+)`)/g)) {
        keys.push((m[1] ?? m[2]).replace(/\$\{(\w)\}/g, (all, c) => consts[c] ?? all));
      }
      for (const m of s.matchAll(/'((?:commerce\.sellerSpace|mp\.)[A-Za-z0-9_.]+)'/g)) {
        keys.push(m[1]);
      }
      for (const key of keys.filter(k => !k.includes('${'))) {
        checked += 1;
        for (const lang of ['fr', 'en'] as const) {
          if (!exists(lang, key)) {
            missing.push(`${rel(f)}: ${lang} ${key}`);
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(100);
    expect(missing).toEqual([]);
  });
  it('les clés construites à l’exécution existent (statuts, actions, périodes…)', () => {
    const S = 'commerce.sellerSpace';
    const dynamic = [
      ...['draft', 'pending_review', 'published', 'rejected', 'suspended', 'archived'].map(k => `${S}.products.status.${k}`),
      ...['edit', 'submit', 'unpublish', 'duplicate', 'archive'].map(k => `${S}.products.actions.${k}`),
      ...['title', 'deliveryUrl', 'price', 'description', 'category'].map(k => `${S}.products.wizard.errors.${k}`),
      ...[1, 2, 3].flatMap(n => [`${S}.products.wizard.step${n}Title`, `${S}.products.wizard.step${n}Sub`]),
      ...['launchDraft', 'launchPublish', 'launchDraftSub', 'launchPublishSub'].map(k => `${S}.products.wizard.${k}`),
      ...['7d', '30d', '12m', 'all'].flatMap(p => [`${S}.sales.period.${p}`, `${S}.sales.subtitle.${p}`, `${S}.analytics.period.${p}`]),
      ...['processing', 'failed'].map(k => `${S}.overview.orderStatus.${k}`),
      ...['overview', 'products', 'sales', 'analytics', 'more'].map(k => `${S}.tabs.${k}`),
    ];
    const missing = dynamic.flatMap(k => (['fr', 'en'] as const).filter(l => !exists(l, k)).map(l => `${l} ${k}`));
    expect(missing).toEqual([]);
  });
});
