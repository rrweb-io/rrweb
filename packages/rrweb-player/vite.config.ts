import path from 'path';
import glob from 'fast-glob';
import { Plugin } from 'vite';
import config from '../../vite.config.default';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import sveltePreprocess from 'svelte-preprocess';
import { emitDts, EmitDtsConfig } from 'svelte2tsx';
import { createRequire } from 'node:module';
import { copyFileSync } from 'node:fs';

const declarationDir = path.resolve('./types');
const require = createRequire(import.meta.url);
const svelteShimsPath = require.resolve('svelte2tsx/svelte-shims-v4.d.ts');

// Helper function to emit TypeScript definitions
async function generateDts(inputPath: string) {
  const config: EmitDtsConfig = {
    declarationDir: declarationDir,
    libRoot: path.dirname(inputPath),
    svelteShimsPath: svelteShimsPath,
  };

  try {
    await emitDts(config);
  } catch (error) {
    console.error(`Error generating .d.ts for ${inputPath}:`, error);
  }
}

function viteSvelteDts(): Plugin {
  return {
    name: 'vite-plugin-svelte-dts',
    async buildStart(options) {
      console.log('Generating .d.ts files for Svelte components...');

      const { input } = options;
      if (typeof input === 'string') {
        await generateDts(input);
      } else if (Array.isArray(input)) {
        for (const file of input) {
          await generateDts(file);
        }
      } else {
        for (const file of Object.values(input)) {
          await generateDts(file);
        }
      }

      // copy .d.ts files to src directory
      const files = await glob('**/*.svelte.d.ts', {
        cwd: declarationDir,
        absolute: true,
      });
      for (const file of files) {
        // resolve the path relative to the src directory
        const dest = path.resolve('src', path.relative(declarationDir, file));
        copyFileSync(file, dest);
      }
    },
  };
}

export default config(path.resolve(__dirname, 'src/main.ts'), 'rrwebPlayer', {
  plugins: [
    viteSvelteDts(),
    svelte({
      preprocess: [sveltePreprocess({ typescript: true })],
    }),
  ],
});
