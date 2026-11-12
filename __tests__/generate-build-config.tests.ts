/**
 * Tests de scripts/generate-build-config.js
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Le script est en CommonJS ; on l'importe via require pour les tests Node.
const {
  validateRegistryConfig,
  buildFixtureConfig,
  generateBuildConfig,
  SERVICE_IDS,
} = require('../../scripts/generate-build-config.js');

describe('validateRegistryConfig', () => {
  it('accepte un secret perService valide', () => {
    const raw = {
      mode: 'perService',
      urls: {
        payment: 'https://payment.example.invalid',
        content: 'https://content.example.invalid',
        shop: 'https://shop.example.invalid',
        marketplace: 'https://marketplace.example.invalid',
        community: 'https://community.example.invalid',
        admin: 'https://admin.example.invalid',
      },
      web: 'https://web.example.invalid',
    };
    const result = validateRegistryConfig(raw);
    expect(result.ok).toBe(true);
  });

  it('accepte un secret gateway valide', () => {
    const raw = {
      mode: 'gateway',
      baseUrl: 'https://gateway.example.invalid',
      prefixes: {
        payment: '/payment',
        content: '/content',
        shop: '/shop',
        marketplace: '/marketplace',
        community: '/community',
        admin: '/admin',
      },
      web: 'https://web.example.invalid',
    };
    const result = validateRegistryConfig(raw);
    expect(result.ok).toBe(true);
  });

  it('refuse un JSON non-objet', () => {
    expect(validateRegistryConfig(null).ok).toBe(false);
    expect(validateRegistryConfig('string').ok).toBe(false);
    expect(validateRegistryConfig([]).ok).toBe(false);
  });

  it('refuse un mode inconnu', () => {
    const result = validateRegistryConfig({
      mode: 'other',
      web: 'https://web.example.invalid',
    });
    expect(result.ok).toBe(false);
  });

  it('refuse une adresse non-https (perService)', () => {
    const raw = {
      mode: 'perService',
      urls: {
        payment: 'http://payment.example.invalid',
        content: 'https://content.example.invalid',
        shop: 'https://shop.example.invalid',
        marketplace: 'https://marketplace.example.invalid',
        community: 'https://community.example.invalid',
        admin: 'https://admin.example.invalid',
      },
      web: 'https://web.example.invalid',
    };
    const result = validateRegistryConfig(raw);
    expect(result.ok).toBe(false);
  });

  it('refuse un service manquant (perService)', () => {
    const raw = {
      mode: 'perService',
      urls: {
        payment: 'https://payment.example.invalid',
        // content manquant
        shop: 'https://shop.example.invalid',
        marketplace: 'https://marketplace.example.invalid',
        community: 'https://community.example.invalid',
        admin: 'https://admin.example.invalid',
      },
      web: 'https://web.example.invalid',
    };
    const result = validateRegistryConfig(raw);
    expect(result.ok).toBe(false);
  });

  it('refuse un préfixe manquant (gateway)', () => {
    const raw = {
      mode: 'gateway',
      baseUrl: 'https://gateway.example.invalid',
      prefixes: {
        payment: '/payment',
        // content manquant
        shop: '/shop',
        marketplace: '/marketplace',
        community: '/community',
        admin: '/admin',
      },
      web: 'https://web.example.invalid',
    };
    const result = validateRegistryConfig(raw);
    expect(result.ok).toBe(false);
  });

  it('refuse un web non-https', () => {
    const raw = {
      mode: 'perService',
      urls: Object.fromEntries(
        SERVICE_IDS.map((id: string) => [id, `https://${id}.example.invalid`]),
      ),
      web: 'http://web.example.invalid',
    };
    const result = validateRegistryConfig(raw);
    expect(result.ok).toBe(false);
  });
});

describe('buildFixtureConfig', () => {
  it('produit un mode perService avec des hôtes .invalid', () => {
    const fixture = buildFixtureConfig();
    expect(fixture.mode).toBe('perService');
    expect(fixture.web).toMatch(/\.invalid$/);
    for (const id of SERVICE_IDS) {
      expect(fixture.urls[id]).toMatch(/^https:\/\//);
      expect(fixture.urls[id]).toMatch(/\.invalid$/);
    }
  });
});

describe('generateBuildConfig (écriture fichier)', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsi-build-config-'));
  const originalCwd = process.cwd();

  afterAll(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, {recursive: true, force: true});
  });

  it('écrit un fichier en mode fixture', () => {
    // On teste la logique de validation + fixture ; l'écriture réelle
    // pointe vers le chemin du dépôt. On vérifie surtout que le mode fixture
    // ne plante pas et que validate + buildFixture fonctionnent ensemble.
    const result = generateBuildConfig({forceFixture: true, secret: null});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.mode).toBe('fixture');
    }
  });

  it('refuse un secret JSON cassé', () => {
    const result = generateBuildConfig({
      forceFixture: false,
      secret: '{not-json',
    });
    expect(result.ok).toBe(false);
  });

  it('accepte un secret valide et retourne le mode', () => {
    const secret = JSON.stringify({
      mode: 'perService',
      urls: Object.fromEntries(
        SERVICE_IDS.map((id: string) => [id, `https://${id}.example.invalid`]),
      ),
      web: 'https://web.example.invalid',
    });
    const result = generateBuildConfig({forceFixture: false, secret});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.mode).toBe('perService');
    }
  });
});
