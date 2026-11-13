/**
 * Tests d'architecture (R-LAY, R-NET, R-DS, R-TREE, R-TEST).
 *
 * 1. Preuve que chaque règle ESLint bloque un exemple fautif et laisse passer
 *    un exemple conforme.
 * 2. Parcours du dépôt : pas de .tsx dans core, tests dans __tests__ à plat,
 *    noms de fichiers propres, .gitkeep présents.
 */

import * as fs from 'fs';
import * as path from 'path';
import {ESLint} from 'eslint';

const ROOT = path.resolve(__dirname, '..');

async function lintCode(
  code: string,
  filePath: string,
): Promise<ESLint.LintResult[]> {
  const eslint = new ESLint({
    cwd: ROOT,
    useEslintrc: true,
    // Chemins virtuels : on ignore les ignores globaux.
    ignore: false,
  });
  return eslint.lintText(code, {filePath: path.join(ROOT, filePath)});
}

type Message = ESLint.LintResult['messages'][number];

function errors(results: ESLint.LintResult[]): Message[] {
  return results.flatMap(r => r.messages.filter(m => m.severity === 2));
}

function hasRule(results: ESLint.LintResult[], ruleId: string): boolean {
  return errors(results).some(m => m.ruleId === ruleId);
}

function hasMessage(results: ESLint.LintResult[], fragment: string): boolean {
  return errors(results).some(m => (m.message || '').includes(fragment));
}

describe('ESLint : R-LAY (imports par couche)', () => {
  it('R-LAY-1 : core ne peut pas importer @app', async () => {
    const r = await lintCode(
      `import {x} from '@app/navigation/RootNavigator';\nexport const y = x;\n`,
      'src/core/session/session.ts',
    );
    expect(hasRule(r, 'no-restricted-imports')).toBe(true);
  });

  it('R-LAY-1 : core ne peut pas importer @shared', async () => {
    const r = await lintCode(
      `import {x} from '@shared/designsystem';\nexport const y = x;\n`,
      'src/core/session/session.ts',
    );
    expect(hasRule(r, 'no-restricted-imports')).toBe(true);
  });

  it('R-LAY-1 : core peut importer en relatif', async () => {
    const r = await lintCode(
      `import {resolveServiceUrl} from '../config/serviceRegistry';\nexport const y = resolveServiceUrl;\n`,
      'src/core/network/http.ts',
    );
    expect(hasRule(r, 'no-restricted-imports')).toBe(false);
  });

  it('R-LAY-3 : shared ne peut pas importer @features', async () => {
    const r = await lintCode(
      `import {x} from '@features/auth/login';\nexport const y = x;\n`,
      'src/shared/designsystem/components/Foo.ts',
    );
    expect(hasRule(r, 'no-restricted-imports')).toBe(true);
  });

  it('R-LAY-3 : shared peut importer @core', async () => {
    const r = await lintCode(
      `import {isRateLimited} from '@core/network';\nexport const y = isRateLimited;\n`,
      'src/shared/designsystem/components/Foo.ts',
    );
    expect(hasRule(r, 'no-restricted-imports')).toBe(false);
  });

  it('R-LAY-4 : une feature ne peut pas importer une autre feature', async () => {
    const r = await lintCode(
      `import {x} from '@features/shop/cart';\nexport const y = x;\n`,
      'src/features/academy/screens/HubScreen.tsx',
    );
    expect(hasRule(r, 'no-restricted-imports')).toBe(true);
  });

  it('R-LAY-4 : un store de feature ne peut pas importer une autre feature', async () => {
    const r = await lintCode(
      `import {x} from '@features/shop/cart';\nexport const y = x;\n`,
      'src/features/academy/store/hubStore.ts',
    );
    expect(hasRule(r, 'no-restricted-imports')).toBe(true);
  });

  it('R-LAY-5 : un screen ne peut pas importer @core/api', async () => {
    const r = await lintCode(
      `import {login} from '@core/api/endpoints/payment/payment.api';\nexport const y = login;\n`,
      'src/features/auth/screens/LoginScreen.tsx',
    );
    expect(hasRule(r, 'no-restricted-imports')).toBe(true);
  });

  it('R-LAY-5 : un component ne peut pas importer @core/config', async () => {
    const r = await lintCode(
      `import {resolveServiceUrl} from '@core/config/serviceRegistry';\nexport const y = resolveServiceUrl;\n`,
      'src/features/member-space/components/MemberCard.tsx',
    );
    expect(hasRule(r, 'no-restricted-imports')).toBe(true);
  });

  it('R-LAY-5 : un screen ne peut pas importer @core/network', async () => {
    const r = await lintCode(
      `import {http} from '@core/network';\nexport const y = http;\n`,
      'src/features/auth/screens/LoginScreen.tsx',
    );
    expect(hasRule(r, 'no-restricted-imports')).toBe(true);
  });

  it('R-LAY-6 : un hook de feature ne peut pas importer @core/api', async () => {
    const r = await lintCode(
      `import {login} from '@core/api/endpoints/payment/payment.api';\nexport const y = login;\n`,
      'src/features/auth/hooks/useLogin.ts',
    );
    expect(hasRule(r, 'no-restricted-imports')).toBe(true);
  });

  it('R-LAY-6 : un store de feature peut importer @core/api', async () => {
    const r = await lintCode(
      `import {login} from '@core/api/endpoints/payment/payment.api';\nexport const y = login;\n`,
      'src/features/auth/store/authStore.ts',
    );
    expect(hasRule(r, 'no-restricted-imports')).toBe(false);
  });

  it('R-LAY-6 : shared/store peut importer @core/api', async () => {
    const r = await lintCode(
      `import {login} from '@core/api/endpoints/payment/payment.api';\nexport const y = login;\n`,
      'src/shared/store/cache.ts',
    );
    expect(hasRule(r, 'no-restricted-imports')).toBe(false);
  });

  it('R-LAY-6 : shared hors store ne peut pas importer @core/api', async () => {
    const r = await lintCode(
      `import {login} from '@core/api/endpoints/payment/payment.api';\nexport const y = login;\n`,
      'src/shared/designsystem/components/Foo.ts',
    );
    expect(hasRule(r, 'no-restricted-imports')).toBe(true);
  });

  it('src/app peut importer @features et @shared', async () => {
    const r = await lintCode(
      `import {x} from '@features/auth/login';\nimport {y} from '@shared/designsystem';\nexport const z = [x, y];\n`,
      'src/app/navigation/RootNavigator.tsx',
    );
    expect(hasRule(r, 'no-restricted-imports')).toBe(false);
  });
});

describe('ESLint : R-NET-1 (fetch et adresses en dur)', () => {
  it('bloque fetch hors core/network', async () => {
    const r = await lintCode(
      `export async function bad() { return fetch('/x'); }\n`,
      'src/features/auth/store/authStore.ts',
    );
    expect(hasRule(r, 'no-restricted-globals')).toBe(true);
  });

  it('bloque fetch dans shared', async () => {
    const r = await lintCode(
      `export async function bad() { return fetch('/x'); }\n`,
      'src/shared/designsystem/components/Foo.ts',
    );
    expect(hasRule(r, 'no-restricted-globals')).toBe(true);
  });

  it('autorise fetch dans core/network', async () => {
    const r = await lintCode(
      `export async function ok() { return fetch('/x'); }\n`,
      'src/core/network/httpClient.ts',
    );
    expect(hasRule(r, 'no-restricted-globals')).toBe(false);
  });

  it('bloque un littéral https dans un store de feature', async () => {
    const r = await lintCode(
      `export const url = 'https://payment.example.invalid/login';\n`,
      'src/features/auth/store/authStore.ts',
    );
    expect(hasRule(r, 'no-restricted-syntax')).toBe(true);
    expect(hasMessage(r, 'R-NET-1')).toBe(true);
  });

  it('bloque un littéral https dans shared', async () => {
    const r = await lintCode(
      `export const url = 'https://payment.example.invalid/login';\n`,
      'src/shared/designsystem/components/Foo.ts',
    );
    expect(hasMessage(r, 'R-NET-1')).toBe(true);
  });

  it('autorise un littéral https dans core/config', async () => {
    const r = await lintCode(
      `export const url = 'https://payment.example.invalid/login';\n`,
      'src/core/config/serviceRegistry.ts',
    );
    expect(hasMessage(r, 'R-NET-1')).toBe(false);
  });
});

describe('ESLint : R-DS-1 (aucun littéral visuel dans features)', () => {
  it('bloque un code couleur hexadécimal', async () => {
    const r = await lintCode(
      `export const color = '#FF5500';\n`,
      'src/features/academy/screens/HubScreen.tsx',
    );
    expect(hasMessage(r, 'R-DS-1')).toBe(true);
  });

  it('bloque rgb()', async () => {
    const r = await lintCode(
      `export const color = 'rgb(255, 85, 0)';\n`,
      'src/features/academy/components/Card.tsx',
    );
    expect(hasMessage(r, 'R-DS-1')).toBe(true);
  });

  it('autorise un code couleur dans shared/designsystem (le thème)', async () => {
    const r = await lintCode(
      `export const color = '#FF5500';\n`,
      'src/shared/designsystem/theme/colors.ts',
    );
    expect(hasMessage(r, 'R-DS-1')).toBe(false);
  });

  it('features : un littéral https ET une couleur produisent les deux erreurs (règles composées)', async () => {
    const r = await lintCode(
      `export const url = 'https://example.invalid';\nexport const color = '#fff';\n`,
      'src/features/academy/screens/HubScreen.tsx',
    );
    expect(hasMessage(r, 'R-NET-1')).toBe(true);
    expect(hasMessage(r, 'R-DS-1')).toBe(true);
  });
});

describe('Parcours du dépôt', () => {
  const SCAN_ROOTS = ['src', 'scripts', '__tests__', 'docs'].map(d =>
    path.join(ROOT, d),
  );
  const IGNORE_DIR_NAMES = new Set([
    'node_modules',
    '.git',
    'android',
    'build',
    'coverage',
    '.gradle',
  ]);

  function walk(dir: string, files: string[] = []): string[] {
    if (!fs.existsSync(dir)) {
      return files;
    }
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (IGNORE_DIR_NAMES.has(entry.name)) {
          continue;
        }
        walk(full, files);
      } else {
        files.push(full);
      }
    }
    return files;
  }

  const allFiles = SCAN_ROOTS.flatMap(root => walk(root));
  const rel = (f: string): string =>
    path.relative(ROOT, f).split(path.sep).join('/');

  it('R-LAY-2 : aucun fichier .tsx dans src/core', () => {
    const coreTsx = allFiles.filter(
      f => rel(f).startsWith('src/core/') && f.endsWith('.tsx'),
    );
    expect(coreTsx.map(rel)).toEqual([]);
  });

  it('R-TEST-1 : aucun fichier *.test.ts(x) (suffixe obligatoire .tests)', () => {
    const wrongSuffix = allFiles.filter(f => /\.test\.tsx?$/.test(f));
    expect(wrongSuffix.map(rel)).toEqual([]);
  });

  it('R-TEST-LOC : aucun *.tests.ts(x) hors de __tests__/', () => {
    const outside = allFiles.filter(
      f => /\.tests\.tsx?$/.test(f) && !rel(f).startsWith('__tests__/'),
    );
    expect(outside.map(rel)).toEqual([]);
  });

  it('R-TEST-LOC : aucun sous-dossier dans __tests__/ (fichiers à plat)', () => {
    const testsDir = path.join(ROOT, '__tests__');
    const dirs = fs
      .readdirSync(testsDir, {withFileTypes: true})
      .filter(d => d.isDirectory())
      .map(d => d.name);
    expect(dirs).toEqual([]);
  });

  it('R-TEST-LOC : tout fichier de __tests__/ finit par .tests.ts ou .tests.tsx', () => {
    const bad = allFiles.filter(
      f => rel(f).startsWith('__tests__/') && !/\.tests\.tsx?$/.test(f),
    );
    expect(bad.map(rel)).toEqual([]);
  });

  it('R-TREE-2 : aucun nom de fichier ou dossier avec espace ou caractère spécial', () => {
    const bad = allFiles.filter(f => /[^a-zA-Z0-9._/-]/.test(rel(f)));
    expect(bad.map(rel)).toEqual([]);
  });

  it('R-TREE-2 : tout .gitkeep est un petit fichier (contenu libre, GitHub web exige une ligne)', () => {
    const gitkeeps = allFiles.filter(f => path.basename(f) === '.gitkeep');
    const tooBig = gitkeeps.filter(f => fs.statSync(f).size > 200);
    expect(tooBig.map(rel)).toEqual([]);
  });

  it('R-TREE-2 : un dossier qui contient un vrai fichier n\'a plus de .gitkeep', () => {
    const stale = allFiles
      .filter(f => path.basename(f) === '.gitkeep')
      .filter(gk => {
        const dir = path.dirname(gk);
        return fs
          .readdirSync(dir, {withFileTypes: true})
          .some(e => e.isFile() && e.name !== '.gitkeep');
      });
    expect(stale.map(rel)).toEqual([]);
  });

  it('R-DS-1 : aucun code couleur ni taille en dur dans src/app hors src/app/dev', () => {
    const appFiles = allFiles.filter(
      f =>
        rel(f).startsWith('src/app/') &&
        !rel(f).startsWith('src/app/dev/') &&
        /\.(ts|tsx)$/.test(f),
    );
    const offenders = appFiles.filter(f =>
      /#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(fs.readFileSync(f, 'utf8')),
    );
    expect(offenders.map(rel)).toEqual([]);
  });
});
