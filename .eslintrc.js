module.exports = {
  root: true,
  extends: '@react-native',
  overrides: [
    // --- Core ---
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
    // --- Shared ---
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
    // --- Features (hors screens/components) : R-LAY-4 + R-LAY-6 ---
    {
      files: ['src/features/**/*.{ts,tsx,js,jsx}'],
      excludedFiles: [
        'src/features/**/screens/**/*.{ts,tsx,js,jsx}',
        'src/features/**/components/**/*.{ts,tsx,js,jsx}',
        'src/features/**/store/**/*.{ts,tsx,js,jsx}',
      ],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['@features/*'],
                message: 'R-LAY-4: une feature n\'importe pas une autre feature. Le commun passe par @shared.',
              },
              {
                group: ['@core/api', '@core/api/*'],
                message: 'R-LAY-6: seuls les stores importent @core/api.',
              },
            ],
          },
        ],
      },
    },
    // --- Features screens + components : R-LAY-4 + R-LAY-5 + R-LAY-6 ---
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
                group: ['@features/*'],
                message: 'R-LAY-4: une feature n\'importe pas une autre feature.',
              },
              {
                group: ['@core/api', '@core/api/*', '@core/network', '@core/network/*', '@core/config', '@core/config/*'],
                message: 'R-LAY-5: screens et components n\'importent pas core/api, core/network ni core/config.',
              },
              {
                group: ['@core/api', '@core/api/*'],
                message: 'R-LAY-6: seuls les stores importent @core/api.',
              },
            ],
          },
        ],
      },
    },
    // --- R-NET-1 + R-DS-1 ensemble dans features (hors tests) ---
    {
      files: ['src/features/**/*.{ts,tsx,js,jsx}'],
      excludedFiles: ['**/*.tests.ts', '**/*.tests.tsx', '__tests__/**'],
      rules: {
        'no-restricted-syntax': [
          'error',
          {
            selector: 'Literal[value=/^https?:\\/\\//]',
            message: 'R-NET-1: aucune adresse http(s) en dur. Utiliser le registre.',
          },
          {
            selector: 'Literal[value=/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]',
            message: 'R-DS-1: aucun code couleur hexadécimal dans features. Utiliser le thème.',
          },
          {
            selector: 'Literal[value=/^rgba?\\(/]',
            message: 'R-DS-1: aucun rgb()/rgba() dans features. Utiliser le thème.',
          },
        ],
        'no-restricted-globals': [
          'error',
          {
            name: 'fetch',
            message: 'R-NET: utiliser le client HTTP de core/network, jamais fetch directement.',
          },
        ],
      },
    },
  ],
};
