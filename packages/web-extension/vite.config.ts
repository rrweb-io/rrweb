import { escapeNoncharacters } from './src/escapeNoncharacters';
import { defineConfig, loadEnv, LibraryFormats, PluginOption } from 'vite';
import webExtension, { readJsonFile } from 'vite-plugin-web-extension';
import zip from 'vite-plugin-zip-pack';
import * as path from 'path';
import type { PackageJson } from 'type-fest';
import react from '@vitejs/plugin-react';
import semver from 'semver';
import { buildManifest } from './src/buildManifest';
import type { ManifestSource } from './src/buildManifest';

const emptyOutDir = !process.argv.includes('--watch');

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

/**
 * Get the extension version based on the rrweb version.
 */
function getExtensionVersion(rrwebVersion: string): string {
  const parsedVersion = semver.parse(rrwebVersion.replace('^', ''));

  if (!parsedVersion) {
    throw new Error('Invalid version format');
  }

  if (parsedVersion.prerelease.length > 0) {
    // If it's a pre-release version like alpha or beta, strip the pre-release identifier
    return `${parsedVersion.major}.${parsedVersion.minor}.${
      parsedVersion.patch
    }.${parsedVersion.prerelease[1] || 0}`;
  } else if (rrwebVersion === '2.0.0') {
    // This version has already been released as the first version. We need to add a patch version to it to avoid publishing conflicts.
    return '2.0.0.100';
  } else {
    return rrwebVersion;
  }
}

const PRODUCTION_CLERK_KEY = 'pk_live_Y2xlcmsucnJ3ZWIuY29tJA';
const DEV_CLERK_KEY =
  'pk_test_Ymxlc3NlZC1tdXNrcmF0LTk3LmNsZXJrLmFjY291bnRzLmRldiQ';
// Public half of the dev signing keypair. It pins the dev extension ID.
// The private key never lives in this repo.
const DEV_MANIFEST_KEY =
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAx4sntShzA4hV5C/Q8vlYLCoiNPv/u9H4pLZdYQ5+u7anviY7FedMukpbJ8iE1XNttjzblzxmMfUPWS2BWABd2TX/2d2n8gq0cYIu0dOcTVeTqHbJ7GNEDpb14sRlojgXCdmWs1S9ZjKa+x6XRA+Oq8HESQRlTrHfM/lHH2W5pH5vpXw+5UiVUgArRCYG+GuHBRMWranuglC5p1QDNp3ip3ZH1p3oVE4VkcIYAI3D1HJnGfvtOqH1E3N+PD9DkahjD3pne3aVSp6aQqWIhHW7ZOqrs2YUYLyUaMKhveFxbQ7oEcDkOzjIYQGO4AnLGI6E+zgONzoI8SLEmY/m4RsvJwIDAQAB';

/** A Clerk publishable key encodes its Frontend API host in base64. */
function clerkFrontendApiHost(publishableKey: string): string {
  const encoded = publishableKey.split('_').slice(2).join('_');
  return Buffer.from(encoded, 'base64').toString().replace(/\$$/, '');
}

function escapeNoncharactersPlugin(): PluginOption {
  return {
    name: 'escape-unicode-noncharacters',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      for (const output of Object.values(bundle)) {
        if (output.type === 'chunk')
          output.code = escapeNoncharacters(output.code);
      }
    },
  };
}

export default defineConfig(({ command, mode }) => {
  const isDevBuild = command === 'serve' || mode === 'development';
  const env = loadEnv(mode, __dirname, 'VITE_');
  const clerkKey =
    env.VITE_CLERK_PUBLISHABLE_KEY ||
    (isDevBuild ? DEV_CLERK_KEY : PRODUCTION_CLERK_KEY);
  const syncHost = (
    env.VITE_CLERK_SYNC_HOST || 'https://app.rrweb.com'
  ).replace(/\/+$/, '');
  const clerkHostPermissions = new Set([
    `${syncHost}/*`,
    `https://${clerkFrontendApiHost(clerkKey)}/*`,
    ...(isDevBuild
      ? [
          'http://localhost/*',
          `https://${clerkFrontendApiHost(DEV_CLERK_KEY)}/*`,
        ]
      : []),
  ]);
  return {
    root: 'src',
    envDir: __dirname,
    define: {
      'import.meta.env.VITE_TARGET_BROWSER': JSON.stringify(
        process.env.TARGET_BROWSER,
      ),
      'import.meta.env.VITE_CLERK_PUBLISHABLE_KEY': JSON.stringify(clerkKey),
    },
    // Configure our outputs - nothing special, this is normal vite config
    build: {
      outDir: path.resolve(
        __dirname,
        'dist',
        process.env.TARGET_BROWSER as string,
      ),
      emptyOutDir,
    },
    // Add the webExtension plugin
    plugins: [
      react(),
      escapeNoncharactersPlugin(),
      webExtension({
        // A function to generate manifest file dynamically.
        manifest: () => {
          const packageJson = readJsonFile('package.json') as PackageJson;
          const rrwebVersion = packageJson.dependencies!.rrweb!.replace(
            '^',
            '',
          );
          return buildManifest(
            readJsonFile('./src/manifest.json') as ManifestSource,
            {
              browser:
                process.env.TARGET_BROWSER === 'chrome' ? 'chrome' : 'firefox',
              base: {
                version: getExtensionVersion(rrwebVersion),
                author: packageJson.author,
                // Firefox rejects version_name as an unknown key.
                ...(process.env.TARGET_BROWSER === 'chrome'
                  ? { version_name: rrwebVersion }
                  : {}),
              },
              clerkHostPermissions: [...clerkHostPermissions],
              key: isDevBuild ? DEV_MANIFEST_KEY : undefined,
            },
          );
        },
        browser: process.env.TARGET_BROWSER,
        webExtConfig: {
          startUrl: ['github.com/rrweb-io/rrweb'],
          watchIgnored: ['*.md', '*.log'],
        },
        // Not declared as content scripts: the background injects both into
        // the recorded tab when the person presses record.
        additionalInputs: [
          'pages/index.html',
          'content/index.ts',
          'content/inject.ts',
        ],
      }) as PluginOption,
      // https://github.com/aklinker1/vite-plugin-web-extension/issues/50#issuecomment-1317922947
      // injected scripts run as classic scripts, so build them as iife
      useSpecialFormat(
        [
          path.resolve(__dirname, 'src/content/index.ts'),
          path.resolve(__dirname, 'src/content/inject.ts'),
        ],
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
  };
});
