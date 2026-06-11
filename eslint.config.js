const { FlatCompat } = require('@eslint/eslintrc');
const js = require('@eslint/js');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

module.exports = [
  {
    ignores: [
      '.DS_Store',
      'node_modules',
      'build',
      'dist',
      'package',
      '.env',
      '.env.*',
      '!*.env.example',
      'pnpm-lock.yaml',
      'package-lock.json',
      'yarn.lock',
    ],
  },
  ...compat.config({
    env: {
      browser: true,
      es2021: true,
      node: true,
      'jest/globals': true,
    },
    extends: [
      'eslint:recommended',
      'plugin:@typescript-eslint/recommended',
      'plugin:@typescript-eslint/recommended-requiring-type-checking',
      'plugin:compat/recommended',
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      tsconfigRootDir: __dirname,
      project: ['./tsconfig.eslint.json', './packages/**/tsconfig.json'],
    },
    plugins: ['@typescript-eslint', 'eslint-plugin-tsdoc', 'jest', 'compat'],
    rules: {
      'tsdoc/syntax': 'warn',
      '@typescript-eslint/prefer-as-const': 'warn',
      camelcase: [
        'error',
        {
          allow: ['rr_.*', 'legacy_.*', 'UNSAFE_.*', '__rrweb_.*'],
        },
      ],
    },
  }),
];
