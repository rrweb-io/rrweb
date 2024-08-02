import { defineConfig, LibraryFormats, PluginOption } from 'vite';
import webExtension, { readJsonFile } from 'vite-plugin-web-extension';
import zip from 'vite-plugin-zip-pack';
import * as path from 'path';
import type { PackageJson } from 'type-fest';
import react from '@vitejs/plugin-react';

function useSpecialFormat(
  entriesToUse: string[],
  format: LibraryFormats,
): PluginOption {
  return {
    name: 'use-special-format',
    config(config) {
      // entry can be string | string[] | {[entryAlias: string]: string}
      const entry = config.build?.lib && config.build.lib.entry;
      let shouldUse = false;

      if (typeof entry === 'string') {
        shouldUse = entriesToUse.includes(entry);
      } else if (Array.isArray(entry)) {
        shouldUse = entriesToUse.some((e) => entry.includes(e));
      } else if (entry && typeof entry === 'object') {
        const entryKeys = Object.keys(entry);
        shouldUse = entriesToUse.some((e) => entryKeys.includes(e));
      }

      if (shouldUse) {
        config.build = config.build ?? {};
        // @ts-expect-error: lib needs to be an object, forcing it.
        config.build.lib =
          typeof config.build.lib == 'object' ? config.build.lib : {};
        // @ts-expect-error: lib is an object
        config.build.lib.formats = [format];
      }
    },
  };
}

export default defineConfig({
  root: 'src',
  // Configure our outputs - nothing special, this is normal vite config
  build: {
    outDir: path.resolve(
      __dirname,
      'dist',
      process.env.TARGET_BROWSER as string,
    ),
    emptyOutDir: true,
  },
  // Add the webExtension plugin
  plugins: [
    react(),
    webExtension({
      // A function to generate manifest file dynamically.
      manifest: () => {
        const packageJson = readJsonFile('package.json') as PackageJson;
        const isProduction = process.env.NODE_ENV === 'production';
        type ManifestBase = {
          common: Record<string, unknown>;
          chrome: Record<string, unknown>;
          firefox: Record<string, unknown>;
        };
        const originalManifest = readJsonFile('./src/manifest.json') as {
          common: Record<string, unknown>;
          v2: ManifestBase;
          v3: ManifestBase;
        };
        const ManifestVersion =
          process.env.TARGET_BROWSER === 'chrome' && isProduction ? 'v3' : 'v2';
        const BrowserName =
          process.env.TARGET_BROWSER === 'chrome' ? 'chrome' : 'firefox';
        const commonManifest = originalManifest.common;
        const manifest = {
          version: '2.0.0',
          author: packageJson.author,
          version_name: packageJson.dependencies?.rrweb?.replace('^', ''),
          ...commonManifest,
        };
        Object.assign(
          manifest,
          originalManifest[ManifestVersion].common,
          originalManifest[ManifestVersion][BrowserName],
        );
        return manifest;
      },
      browser: process.env.TARGET_BROWSER,
      webExtConfig: {
        startUrl: ['github.com/rrweb-io/rrweb'],
        watchIgnored: ['*.md', '*.log'],
      },
      additionalInputs: ['pages/index.html', 'content/inject.ts'],
    }),
    // https://github.com/aklinker1/vite-plugin-web-extension/issues/50#issuecomment-1317922947
    // transfer inject.ts to iife format to avoid error
    useSpecialFormat(
      [path.resolve(__dirname, 'src/content/inject.ts')],
      'iife',
    ),
    process.env.ZIP === 'true' &&
      zip({
        inDir: `dist/${process.env.TARGET_BROWSER || 'chrome'}`,
        outDir: 'dist',
        outFileName: `${process.env.TARGET_BROWSER || 'chrome'}.zip`,
      }),
  ],
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './src'),
    },
  },
});
