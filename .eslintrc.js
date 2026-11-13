/**
 * Règles d'architecture (ARCHITECTURE.md : R-LAY, R-NET, R-DS).
 *
 * IMPORTANT : ESLint ne FUSIONNE PAS les options d'une même règle entre deux
 * overrides : le dernier override qui correspond REMPLACE le précédent.
 * Chaque zone du dépôt a donc UN SEUL override par règle, avec la liste
 * complète des motifs qui s'y appliquent. Les zones sont exclusives
 * (excludedFiles) pour qu'aucun fichier ne tombe dans deux zones.
 */

const EXT = '*.{ts,tsx,js,jsx}';

// --- Motifs d'imports interdits (réutilisés par zone) ---------------------
const NO_APP = {
  group: ['@app', '@app/*'],
  message: 'R-LAY-1/3: seul src/app peut être importé par src/app lui-même.',
};
const NO_SHARED = {
  group: ['@shared', '@shared/*'],
  message: 'R-LAY-1/3: cette couche n\'importe pas @shared (alias).',
};
const NO_FEATURES = {
  group: ['@features', '@features/*'],
  message:
    'R-LAY-1/3/4: import de @features interdit ici (une feature n\'importe pas une autre feature ; le commun passe par @shared).',
};
const NO_API = {
  group: ['@core/api', '@core/api/*'],
  message:
    'R-LAY-6: seuls les dossiers store/ (feature et shared/store) importent @core/api.',
};
const NO_NETWORK_CONFIG = {
  group: [
    '@core/network',
    '@core/network/*',
    '@core/config',
    '@core/config/*',
  ],
  message:
    'R-LAY-5: screens et components n\'importent jamais @core/network ni @core/config. Passer par un store.',
};

const importsRule = patterns => [
  'error',
  {patterns},
];

// --- R-NET-1 / R-DS-1 : sélecteurs ----------------------------------------
const HTTP_LITERAL = {
  selector: 'Literal[value=/^https?:\\/\\//]',
  message:
    'R-NET-1: aucune adresse http(s) en dur. Elle vient du registre (src/core/config).',
};
const HTTP_TEMPLATE = {
  selector: 'TemplateElement[value.raw=/https?:\\/\\//]',
  message:
    'R-NET-1: aucune adresse http(s) en dur. Elle vient du registre (src/core/config).',
};
const HEX_COLOR = {
  selector:
    'Literal[value=/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]',
  message:
    'R-DS-1: aucun code couleur hexadécimal dans features. Utiliser le thème.',
};
const RGB_COLOR = {
  selector: 'Literal[value=/^(rgb|hsl)a?\\(/]',
  message: 'R-DS-1: aucune couleur rgb()/hsl() dans features. Utiliser le thème.',
};
const NO_FETCH = [
  'error',
  {
    name: 'fetch',
    message:
      'R-NET-1: fetch est interdit hors de src/core/network. Utiliser le client HTTP.',
  },
];

const TEST_FILES = ['**/*.tests.ts', '**/*.tests.tsx', '__tests__/**'];

module.exports = {
  root: true,
  extends: '@react-native',
  overrides: [
    // ======== R-LAY : imports par zone (une règle par zone) ================

    // core : n'importe ni app, ni shared, ni features (R-LAY-1)
    {
      files: [`src/core/**/${EXT}`],
      rules: {
        'no-restricted-imports': importsRule([NO_APP, NO_SHARED, NO_FEATURES]),
      },
    },

    // shared (hors shared/store) : seulement @core, jamais @core/api (R-LAY-3, R-LAY-6)
    {
      files: [`src/shared/**/${EXT}`],
      excludedFiles: [`src/shared/store/**/${EXT}`],
      rules: {
        'no-restricted-imports': importsRule([
          NO_APP,
          NO_SHARED,
          NO_FEATURES,
          NO_API,
        ]),
      },
    },

    // shared/store : peut importer @core/api (R-LAY-6)
    {
      files: [`src/shared/store/**/${EXT}`],
      rules: {
        'no-restricted-imports': importsRule([NO_APP, NO_SHARED, NO_FEATURES]),
      },
    },

    // features/store : peut importer @core/api, pas une autre feature (R-LAY-4)
    {
      files: [`src/features/**/store/**/${EXT}`],
      rules: {
        'no-restricted-imports': importsRule([NO_FEATURES]),
      },
    },

    // features/screens et features/components : pas d'api, network, config (R-LAY-4/5/6)
    {
      files: [
        `src/features/**/screens/**/${EXT}`,
        `src/features/**/components/**/${EXT}`,
      ],
      rules: {
        'no-restricted-imports': importsRule([
          NO_FEATURES,
          NO_API,
          NO_NETWORK_CONFIG,
        ]),
      },
    },

    // autres fichiers de features (hooks, utils…) : R-LAY-4 + R-LAY-6
    {
      files: [`src/features/**/${EXT}`],
      excludedFiles: [
        `src/features/**/store/**/${EXT}`,
        `src/features/**/screens/**/${EXT}`,
        `src/features/**/components/**/${EXT}`,
      ],
      rules: {
        'no-restricted-imports': importsRule([NO_FEATURES, NO_API]),
      },
    },

    // src/app : peut importer features, shared et core (aucune restriction d'import)

    // ======== R-NET-1 : fetch et adresses http(s) =========================
    // Toute la source, sauf core/network, core/config et les tests.
    {
      files: [`src/**/${EXT}`],
      excludedFiles: [
        `src/core/network/**/${EXT}`,
        `src/core/config/**/${EXT}`,
        ...TEST_FILES,
      ],
      rules: {
        'no-restricted-globals': NO_FETCH,
        'no-restricted-syntax': ['error', HTTP_LITERAL, HTTP_TEMPLATE],
      },
    },

    // features : R-NET-1 ET R-DS-1 ensemble (une seule règle no-restricted-syntax)
    {
      files: [`src/features/**/${EXT}`],
      excludedFiles: TEST_FILES,
      rules: {
        'no-restricted-globals': NO_FETCH,
        'no-restricted-syntax': [
          'error',
          HTTP_LITERAL,
          HTTP_TEMPLATE,
          HEX_COLOR,
          RGB_COLOR,
        ],
      },
    },
  ],
};
