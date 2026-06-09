/** @type { import("eslint").Linter.Config } */
module.exports = {
  root: true,
  ignorePatterns: [
    'dist',
    'types',
    'vite.config.ts',
    'vite-env.d.ts',
    'svelte.config.js',
    'public/events.js',
    'src/**/*.svelte.d.ts',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:svelte/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2020,
    extraFileExtensions: ['.svelte'],
  },
  env: {
    browser: true,
    es2017: true,
    node: true,
  },
  rules: {
    'no-fallthrough': 'warn',
    'svelte/valid-compile': 'warn',
  },
  overrides: [
    {
      files: ['*.svelte'],
      parser: 'svelte-eslint-parser',
      parserOptions: {
        parser: '@typescript-eslint/parser',
      },
    },
  ],
};
