module.exports = {
  root: true,
  env: {
    es2022: true,
    node: true,
    browser: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  ignorePatterns: ['dist', 'node_modules', 'coverage', '*.config.cjs'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: [
              '@rtctp/domain/src/*',
              '@rtctp/api',
              '@rtctp/api/*',
              '@rtctp/web',
              '@rtctp/web/*',
              '../api/src/*',
              '../../api/src/*',
              '../web/src/*',
              '../../web/src/*',
              '../packages/domain/src/*',
              '../../packages/domain/src/*',
              '../../../packages/domain/src/*',
              '**/apps/api/src/*',
              '**/apps/web/src/*',
              '**/packages/domain/src/*',
            ],
            message:
              'Use workspace package public exports only; do not cross package boundaries through source paths.',
          },
        ],
      },
    ],
  },
  overrides: [
    {
      files: ['packages/domain/src/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [
              {
                name: 'express',
                message: 'Domain code must not depend on API transport frameworks.',
              },
              {
                name: 'react',
                message: 'Domain code must not depend on React presentation layers.',
              },
              {
                name: 'react-dom',
                message: 'Domain code must not depend on React presentation layers.',
              },
              {
                name: 'ws',
                message: 'Domain code must not depend on WebSocket transport frameworks.',
              },
              {
                name: 'cors',
                message: 'Domain code must not depend on API middleware.',
              },
              {
                name: 'pino',
                message: 'Domain code must not depend on logging infrastructure.',
              },
            ],
            patterns: [
              {
                group: [
                  '@rtctp/api',
                  '@rtctp/api/*',
                  '@rtctp/web',
                  '@rtctp/web/*',
                  '../apps/api/*',
                  '../../apps/api/*',
                  '../../../apps/api/*',
                  '../apps/web/*',
                  '../../apps/web/*',
                  '../../../apps/web/*',
                  '**/apps/api/*',
                  '**/apps/web/*',
                ],
                message: 'Domain code cannot import application packages.',
              },
            ],
          },
        ],
      },
    },
    {
      files: ['apps/api/src/**/*.ts', 'apps/api/test/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: [
                  '@rtctp/domain/src/*',
                  '@rtctp/web',
                  '@rtctp/web/*',
                  '../web/src/*',
                  '../../web/src/*',
                  '../packages/domain/src/*',
                  '../../packages/domain/src/*',
                  '../../../packages/domain/src/*',
                  '**/apps/web/src/*',
                ],
                message:
                  'API code may use @rtctp/domain public exports, but must not import web code or domain internals.',
              },
            ],
          },
        ],
      },
    },
    {
      files: ['apps/web/src/**/*.ts', 'apps/web/src/**/*.tsx'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: [
                  '@rtctp/domain/src/*',
                  '@rtctp/api',
                  '@rtctp/api/*',
                  '../api/src/*',
                  '../../api/src/*',
                  '../packages/domain/src/*',
                  '../../packages/domain/src/*',
                  '../../../packages/domain/src/*',
                  '**/apps/api/src/*',
                ],
                message:
                  'Web code may use @rtctp/domain public exports, but must not import API code or domain internals.',
              },
            ],
          },
        ],
      },
    },
  ],
};
