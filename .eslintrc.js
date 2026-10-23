// TODO: add .eslintignore. More info: https://bobbyhadz.com/blog/typescript-parseroptions-project-has-been-set-for
module.exports = {
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
    'camelcase': ['error', {
      allow: ['rr_.*', 'legacy_.*', 'UNSAFE_.*', '__rrweb_.*'],
    }],
  },
};
