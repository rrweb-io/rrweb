import { defineConfig } from 'vite-plus';

export default defineConfig({
  fmt: {
    trailingComma: 'all',
    ignorePatterns: [
      '.vscode/**',
      '.yarn/**',
      '.changeset/*.md',
      '**/*.css',
      '**/*.html',
      '**/*.json',
      'packages/rrweb-player/.svelte-kit/generated/**',
      'packages/rrweb-player/.svelte-kit/ambient.d.ts',
      'packages/rrweb-player/.svelte-kit/non-ambient.d.ts',
    ],
  },
  lint: {
    ignorePatterns: [
      'build/**',
      'dist/**',
      'package/**',
      'node_modules/**',
      '.yarn/**',
      'packages/rrweb-player/.svelte-kit/**',
    ],
    options: {
      typeAware: false,
      typeCheck: false,
    },
    rules: {
      'const-comparisons': 'off',
      'no-constant-binary-expression': 'off',
      'no-eval': 'off',
      'no-unassigned-vars': 'off',
      'no-unsafe-optional-chaining': 'off',
      'no-unused-expressions': 'off',
      'no-unused-vars': 'off',
      'no-useless-escape': 'off',
    },
  },
});
