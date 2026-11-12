/**
 * Génère src/core/config/buildConfig.generated.ts à partir du secret
 * DSI_REGISTRY_JSON ou en mode fixture (adresses .invalid).
 *
 * Usage :
 *   node scripts/generate-build-config.js          # secret ou fixture
 *   node scripts/generate-build-config.js --fixture # force fixture
 *
 * Les messages d'erreur n'affichent jamais le contenu du secret (R-SEC-5).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SERVICE_IDS = [
  'payment',
  'content',
  'shop',
  'marketplace',
  'community',
  'admin',
];

const OUTPUT_PATH = path.join(
  __dirname,
  '..',
  'src',
  'core',
  'config',
  'buildConfig.generated.ts',
);

/**
 * Valide la configuration du registre.
 * @param {unknown} raw
 * @returns {{ ok: true, config: object } | { ok: false, error: string }}
 */
function validateRegistryConfig(raw) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return {ok: false, error: 'La configuration doit être un objet JSON.'};
  }

  const obj = /** @type {Record<string, unknown>} */ (raw);

  if (obj.mode !== 'perService' && obj.mode !== 'gateway') {
    return {
      ok: false,
      error: 'mode doit être "perService" ou "gateway".',
    };
  }

  if (typeof obj.web !== 'string' || !/^https:\/\/[^\s]+$/.test(obj.web)) {
    return {
      ok: false,
      error: 'web doit être une URL https valide.',
    };
  }

  if (obj.mode === 'perService') {
    if (obj.urls === null || typeof obj.urls !== 'object' || Array.isArray(obj.urls)) {
      return {ok: false, error: 'urls doit être un objet (mode perService).'};
    }
    const urls = /** @type {Record<string, unknown>} */ (obj.urls);
    for (const id of SERVICE_IDS) {
      if (typeof urls[id] !== 'string' || !/^https:\/\/[^\s]+$/.test(urls[id])) {
        return {
          ok: false,
          error: `urls.${id} doit être une URL https valide.`,
        };
      }
    }
  } else {
    if (typeof obj.baseUrl !== 'string' || !/^https:\/\/[^\s]+$/.test(obj.baseUrl)) {
      return {
        ok: false,
        error: 'baseUrl doit être une URL https valide (mode gateway).',
      };
    }
    if (
      obj.prefixes === null ||
      typeof obj.prefixes !== 'object' ||
      Array.isArray(obj.prefixes)
    ) {
      return {ok: false, error: 'prefixes doit être un objet (mode gateway).'};
    }
    const prefixes = /** @type {Record<string, unknown>} */ (obj.prefixes);
    for (const id of SERVICE_IDS) {
      if (typeof prefixes[id] !== 'string' || prefixes[id].length === 0) {
        return {
          ok: false,
          error: `prefixes.${id} doit être une chaîne non vide.`,
        };
      }
    }
  }

  return {ok: true, config: obj};
}

/**
 * Construit la configuration fixture (adresses .invalid).
 */
function buildFixtureConfig() {
  return {
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
}

/**
 * Écrit le fichier TypeScript généré.
 * @param {object} registry
 */
function writeGeneratedFile(registry) {
  const content = `// Fichier généré par scripts/generate-build-config.js — NE PAS ÉDITER.
// Ignoré par git (R-NET-3).

export const BUILD_CONFIG = {
  registry: ${JSON.stringify(registry, null, 2)} as const,
};
`;

  const dir = path.dirname(OUTPUT_PATH);
  fs.mkdirSync(dir, {recursive: true});
  fs.writeFileSync(OUTPUT_PATH, content, 'utf8');
}

/**
 * Point d'entrée principal.
 * @param {{ forceFixture?: boolean, secret?: string | null }} [options]
 * @returns {{ ok: true, mode: string } | { ok: false, error: string }}
 */
function generateBuildConfig(options = {}) {
  const forceFixture = options.forceFixture === true;
  const secret = options.secret !== undefined ? options.secret : process.env.DSI_REGISTRY_JSON;

  if (forceFixture || !secret) {
    const fixture = buildFixtureConfig();
    writeGeneratedFile(fixture);
    return {ok: true, mode: 'fixture'};
  }

  let parsed;
  try {
    parsed = JSON.parse(secret);
  } catch {
    return {
      ok: false,
      error: 'DSI_REGISTRY_JSON n\'est pas un JSON valide.',
    };
  }

  const validation = validateRegistryConfig(parsed);
  if (!validation.ok) {
    return {ok: false, error: validation.error};
  }

  writeGeneratedFile(validation.config);
  return {ok: true, mode: validation.config.mode};
}

// Exécution CLI uniquement si lancé directement
if (require.main === module) {
  const forceFixture = process.argv.includes('--fixture');
  const result = generateBuildConfig({forceFixture});
  if (!result.ok) {
    console.error(`[generate-build-config] ${result.error}`);
    process.exit(1);
  }
  console.log(`[generate-build-config] OK (mode=${result.mode})`);
}

module.exports = {
  validateRegistryConfig,
  buildFixtureConfig,
  generateBuildConfig,
  SERVICE_IDS,
  OUTPUT_PATH,
};
