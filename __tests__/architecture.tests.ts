/**
 * Tests d'architecture (R-LAY, R-NET, R-DS, R-TREE, R-TEST).
 *
 * 1. Preuve que chaque règle ESLint du §3.3 bloque un exemple fautif
 *    et laisse passer un exemple conforme.
 * 2. Parcours du dépôt : pas de .tsx dans core, suffixe .tests, noms propres,
 *    contenu exact des .gitkeep.
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
    // On ignore les ignores globaux pour pouvoir tester des chemins virtuels
    ignore: false,
  });
  return eslint.lintText(code, {filePath: path.join(ROOT, filePath)});
}

function hasError(results: ESLint.LintResult[], ruleId?: string): boolean {
  return results.some(r =>
    r.messages.some(
      m => m.severity === 2 && (ruleId === undefined || m.ruleId === ruleId),
    ),
  );
}

describe('ESLint architecture rules', () => {
  // R-LAY-1 : core n'importe pas @app / @shared / @features
  it('R-LAY-1 : bloque un import @app depuis core', async () => {
    const results = await lintCode(
      `import {x} from '@app/navigation/RootNavigator';\n`,
      'src/core/session/session.ts',
    );
    expect(hasError(results, 'no-restricted-imports')).toBe(true);
  });

  it('R-LAY-1 : autorise un import relatif interne à core', async () => {
    const results = await lintCode(
      `import {resolveServiceUrl} from '../config/serviceRegistry';\n`,
      'src/core/network/http.ts',
    );
    expect(hasError(results, 'no-restricted-imports')).toBe(false);
  });

  // R-LAY-3 : shared n'importe que @core
  it('R-LAY-3 : bloque un import @features depuis shared', async () => {
    const results = await lintCode(
      `import {x} from '@features/auth/login';\n`,
      'src/shared/store/cache.ts',
    );
    expect(hasError(results, 'no-restricted-imports')).toBe(true);
  });

  // R-LAY-4 : une feature n'importe pas une autre
  it('R-LAY-4 : bloque un import inter-feature', async () => {
    const results = await lintCode(
      `import {x} from '@features/shop/cart';\n`,
      'src/features/academy/screens/HubScreen.tsx',
    );
    expect(hasError(results, 'no-restricted-imports')).toBe(true);
  });

  // R-LAY-5 : screens/components n'importent pas core/api|network|config
  it('R-LAY-5 : bloque un import @core/api depuis un screen', async () => {
    const results = await lintCode(
      `import {login} from '@core/api/endpoints/payment/payment.api';\n`,
      'src/features/auth/screens/LoginScreen.tsx',
    );
    expect(hasError(results, 'no-restricted-imports')).toBe(true);
  });

  it('R-LAY-5 : bloque un import @core/config depuis un component', async () => {
    const results = await lintCode(
      `import {resolveServiceUrl} from '@core/config/serviceRegistry';\n`,
      'src/features/member-space/components/MemberCard.tsx',
    );
    expect(hasError(results, 'no-restricted-imports')).toBe(true);
  });

  // R-LAY-6 : seuls les stores importent @core/api
  it('R-LAY-6 : bloque un import @core/api hors store', async () => {
    const results = await lintCode(
      `import {login} from '@core/api/endpoints/payment/payment.api';\n`,
      'src/features/auth/hooks/useLogin.ts',
    );
    expect(hasError(results, 'no-restricted-imports')).toBe(true);
  });

  it('R-LAY-6 : autorise un import @core/api depuis un store', async () => {
    const results = await lintCode(
      `import {login} from '@core/api/endpoints/payment/payment.api';\n`,
      'src/features/auth/store/authStore.ts',
    );
    // Le override store exclus les restrictions R-LAY-6
    // (il peut encore y avoir d'autres règles, mais pas celle-ci sur @core/api)
    const apiErrors = results.flatMap(r =>
      r.messages.filter(
        m =>
          m.severity === 2 &&
          m.ruleId === 'no-restricted-imports' &&
          (m.message || '').includes('R-LAY-6'),
      ),
    );
    expect(apiErrors.length).toBe(0);
  });

  // R-NET-1 : fetch et littéraux http interdits hors network/config
  it('R-NET-1 : bloque fetch hors core/network', async () => {
    const results = await lintCode(
      `export async function bad() { return fetch('https://example.invalid'); }\n`,
      'src/features/auth/store/authStore.ts',
    );
    expect(hasError(results, 'no-restricted-globals')).toBe(true);
  });

  it('R-NET-1 : bloque un littéral https hors core/config', async () => {
    const results = await lintCode(
      `const url = 'https://payment.example.invalid/login';\n`,
      'src/features/auth/store/authStore.ts',
    );
    expect(hasError(results, 'no-restricted-syntax')).toBe(true);
  });

  // R-DS-1 (partiel) : pas de couleur dans features
  it('R-DS-1 : bloque un code couleur hex dans features', async () => {
    const results = await lintCode(
      `const color = '#FF5500';\n`,
      'src/features/academy/screens/HubScreen.tsx',
    );
    expect(hasError(results, 'no-restricted-syntax')).toBe(true);
  });

  it('R-DS-1 : bloque rgb() dans features', async () => {
    const results = await lintCode(
      `const color = 'rgb(255, 85, 0)';\n`,
      'src/features/academy/components/Card.tsx',
    );
    expect(hasError(results, 'no-restricted-syntax')).toBe(true);
  });
});

describe('Parcours du dépôt', () => {
  function walk(dir: string, files: string[] = []): string[] {
    if (!fs.existsSync(dir)) {
      return files;
    }
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git') {
          continue;
        }
        walk(full, files);
      } else {
        files.push(full);
      }
    }
    return files;
  }

  const allFiles = walk(ROOT);

  it('R-LAY-2 : aucun fichier .tsx dans src/core', () => {
    const coreTsx = allFiles.filter(
      f =>
        f.includes(`${path.sep}src${path.sep}core${path.sep}`) &&
        f.endsWith('.tsx'),
    );
    expect(coreTsx).toEqual([]);
  });

  it('R-TEST : aucun fichier nommé *.test.ts(x) (suffixe obligatoire .tests)', () => {
    const wrongSuffix = allFiles.filter(f =>
      /\.test\.tsx?$/.test(f),
    );
    expect(wrongSuffix).toEqual([]);
  });

  it('R-TREE-2 : aucun nom de fichier ou dossier avec espace ou caractère spécial', () => {
    const bad = allFiles.filter(f => {
      const rel = path.relative(ROOT, f);
      // Autorise le point, le tiret, l'underscore, les alphanumériques
      return /[^a-zA-Z0-9._/\-]/.test(rel);
    });
    expect(bad).toEqual([]);
  });

  it('R-TREE-2 : tout .gitkeep contient exactement "keep"', () => {
    const gitkeeps = allFiles.filter(f => path.basename(f) === '.gitkeep');
    for (const gk of gitkeeps) {
      const content = fs.readFileSync(gk, 'utf8').trim();
      expect(content).toBe('keep');
    }
  });
});
