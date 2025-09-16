/// <reference types="vite/client" />
import dts from 'vite-plugin-dts';
import { copyFileSync } from 'node:fs';
import { defineConfig, LibraryOptions, LibraryFormats, Plugin } from 'vite';
import { build, Format } from 'esbuild';
import { resolve } from 'path';
import { umdWrapper } from 'esbuild-plugin-umd-wrapper';
import * as fs from 'node:fs';
import { visualizer } from 'rollup-plugin-visualizer';

// don't empty out dir if --watch flag is passed
const emptyOutDir = !process.argv.includes('--watch');
/**
 * Chrome web store does not allow base64 inline workers.
 * For chrome extension, we need to disable worker inlining to pass the review.
 */
const disableWorkerInlining = process.env.DISABLE_WORKER_INLINING === 'true';

function minifyAndUMDPlugin({
  name,
  outDir,
}: {
  name: LibraryOptions['name'];
  outDir: string;
}): Plugin {
  return {
    name: 'minify-plugin',
    async writeBundle(outputOptions, bundle) {
      for (const file of Object.values(bundle)) {
        if (
          file.type === 'asset' &&
          (file.fileName.endsWith('.cjs.map') || file.fileName.endsWith('.css'))
        ) {
          const isCSS = file.fileName.endsWith('.css');
          const inputFilePath = resolve(
            outputOptions.dir!,
            file.fileName,
          ).replace(/\.map$/, '');
          const baseFileName = file.fileName.replace(
            /(\.cjs|\.css)(\.map)?$/,
            '',
          );
          const outputFilePath = resolve(outputOptions.dir!, baseFileName);
          // console.log(outputFilePath, 'minifying', file.fileName);
          if (isCSS) {
            await buildFile({
              input: inputFilePath,
              output: `${outputFilePath}.min.css`,
              minify: true,
              isCss: true,
              outDir,
            });
          } else {
            await buildFile({
              name,
              input: inputFilePath,
              output: `${outputFilePath}.umd.cjs`,
              minify: false,
              isCss: false,
              outDir,
            });
            await buildFile({
              name,
              input: inputFilePath,
              output: `${outputFilePath}.umd.min.cjs`,
              minify: true,
              isCss: false,
              outDir,
            });
          }
        }
      }
    },
  };
}

async function buildFile({
  name,
  input,
  output,
  minify,
  isCss,
  outDir,
}: {
  name?: LibraryOptions['name'];
  input: string;
  output: string;
  outDir: string;
  minify: boolean;
  isCss: boolean;
}) {
  await build({
    entryPoints: [input],
    outfile: output,
    minify,
    sourcemap: true,
    format: isCss ? undefined : ('umd' as Format),
    target: isCss ? undefined : 'es2017',
    treeShaking: !isCss,
    plugins: [
      umdWrapper({
        libraryName: name,
      }),
    ],
  });
  const filename = output.replace(new RegExp(`^.+/(${outDir}/)`), '$1');
  console.log(filename);
  console.log(`${filename}.map`);
}

export default function (
  entry: LibraryOptions['entry'],
  name: LibraryOptions['name'],
  options?: { outputDir?: string; fileName?: string; plugins?: Plugin[] },
) {
  const { fileName, outputDir: outDir = 'dist', plugins = [] } = options || {};

  let formats: LibraryFormats[] = ['es', 'cjs'];

  return defineConfig(() => ({
    build: {
      // See https://vitejs.dev/guide/build.html#library-mode
      lib: {
        entry,
        name,
        fileName,
        // TODO: turn on `umd` for rrweb when https://github.com/schummar/vite/tree/feature/libMultiEntryUMD gets merged
        // More info: https://github.com/vitejs/vite/pull/7047#issuecomment-1288080855
        // formats: ['es', 'umd', 'cjs'],
        formats,
      },

      outDir,

      emptyOutDir,

      // Leaving this unminified so you can see what exactly gets included in
      // the bundles
      minify: false,

      sourcemap: true,

      // rollupOptions: {
      //   output: {
      //     manualChunks: {},
      //   },
      // },
    },
    plugins: [
      dts({
        insertTypesEntry: true,
        rollupTypes: true,
        afterBuild: (emittedFiles: Map<string, string>) => {
          // To pass publint (`npm x publint@latest`) and ensure the
          // package is supported by all consumers, we must export types that are
          // read as ESM. To do this, there must be duplicate types with the
          // correct extension supplied in the package.json exports field.
          const files: string[] = Array.from(emittedFiles.keys());
          files.forEach((file) => {
            const ctsFile = file.replace('.d.ts', '.d.cts');
            copyFileSync(file, ctsFile);
          });
        },
      }),
      minifyAndUMDPlugin({ name, outDir }),
      visualizer({
        filename: resolve(__dirname, name + '-bundle-analysis.html'), // Path for the HTML report
        open: false, // don't Automatically open the report in the browser
      }),
      {
        name: 'remove-worker-inline',
        enforce: 'pre',
        transform(code, id) {
          if (!disableWorkerInlining) return;
          if (/\.(js|ts|jsx|tsx)$/.test(id)) {
            return {
              code: code.replace(/\?worker&inline/g, '?worker'),
              map: null,
            };
          }
        },
      },
      ...plugins,
    ],
  }));
}
