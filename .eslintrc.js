module.exports = {
  root: true,
  extends: '@react-native',
  rules: {
    // R-LAY-1 : core n'importe jamais app / shared / features
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@app', '@app/*'],
            message: 'R-LAY-1: src/core ne doit pas importer @app.',
          },
          {
            group: ['@shared', '@shared/*'],
            message: 'R-LAY-1 / R-LAY-3: imports interdits selon la couche.',
          },
          {
            group: ['@features', '@features/*'],
            message: 'R-LAY-1 / R-LAY-4: imports interdits selon la couche.',
          },
        ],
      },
    ],
  },
  overrides: [
    // R-LAY-1 : core
    {
      files: ['src/core/**/*.{ts,tsx,js,jsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['@app', '@app/*', '@shared', '@shared/*', '@features', '@features/*'],
                message: 'R-LAY-1: core n\'importe pas @app, @shared ni @features.',
              },
            ],
          },
        ],
      },
    },
    // R-LAY-3 : shared n'importe que @core
    {
      files: ['src/shared/**/*.{ts,tsx,js,jsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['@app', '@app/*', '@features', '@features/*', '@shared', '@shared/*'],
                message: 'R-LAY-3: shared n\'importe que @core (pas @app, @features, ni un autre @shared via alias).',
              },
            ],
          },
        ],
      },
    },
    // R-LAY-4 : une feature n'importe pas une autre feature
    {
      files: ['src/features/**/*.{ts,tsx,js,jsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['@features/*'],
                message: 'R-LAY-4: une feature n\'importe pas une autre feature. Le commun passe par @shared.',
              },
            ],
          },
        ],
      },
    },
    // R-LAY-5 : screens et components n'importent pas core/api, core/network, core/config
    {
      files: [
        'src/features/**/screens/**/*.{ts,tsx,js,jsx}',
        'src/features/**/components/**/*.{ts,tsx,js,jsx}',
      ],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: [
                  '@core/api',
                  '@core/api/*',
                  '@core/network',
                  '@core/network/*',
                  '@core/config',
                  '@core/config/*',
                ],
                message:
                  'R-LAY-5: screens et components n\'importent jamais @core/api, @core/network ni @core/config. Passer par un store.',
              },
              {
                group: ['@features/*'],
                message: 'R-LAY-4: une feature n\'importe pas une autre feature.',
              },
            ],
          },
        ],
      },
    },
    // R-LAY-6 : seuls les stores peuvent importer @core/api
    {
      files: ['src/features/**/*.{ts,tsx,js,jsx}', 'src/shared/**/*.{ts,tsx,js,jsx}'],
      excludedFiles: [
        '**/store/**/*.{ts,tsx,js,jsx}',
        'src/shared/store/**/*.{ts,tsx,js,jsx}',
      ],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['@core/api', '@core/api/*'],
                message: 'R-LAY-6: seuls les dossiers store/ (feature et shared/store) importent @core/api.',
              },
            ],
          },
        ],
      },
    },
    // R-NET-1 : fetch et littéraux http(s) interdits hors core/network et core/config
    {
      files: ['**/*.{ts,tsx,js,jsx}'],
      excludedFiles: [
        'src/core/network/**/*.{ts,tsx,js,jsx}',
        'src/core/config/**/*.{ts,tsx,js,jsx}',
        '**/*.tests.ts',
        '**/*.tests.tsx',
        'scripts/**/*',
      ],
      rules: {
        'no-restricted-globals': [
          'error',
          {
            name: 'fetch',
            message: 'R-NET-1: fetch est interdit hors de src/core/network.',
          },
        ],
        'no-restricted-syntax': [
          'error',
          {
            selector: 'Literal[value=/^https?:\\/\\//]',
            message:
              'R-NET-1: aucun littéral http(s):// hors de src/core/config (sauf tests *.tests.ts avec hôte .invalid).',
          },
          {
            selector: 'TemplateElement[value.raw=/https?:\\/\\//]',
            message:
              'R-NET-1: aucun littéral http(s):// hors de src/core/config (sauf tests *.tests.ts avec hôte .invalid).',
          },
        ],
      },
    },
    // R-DS-1 (partiel) : pas de code couleur dans features
    {
      files: ['src/features/**/*.{ts,tsx,js,jsx}'],
      excludedFiles: ['**/*.tests.ts', '**/*.tests.tsx'],
      rules: {
        'no-restricted-syntax': [
          'error',
          {
            selector: 'Literal[value=/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]',
            message: 'R-DS-1: aucun code couleur hexadécimal dans features. Utiliser le thème.',
          },
          {
            selector: 'Literal[value=/^rgba?\\(/]',
            message: 'R-DS-1: aucun rgb()/rgba() dans features. Utiliser le thème.',
          },
        ],
      },
    },
  ],
};
