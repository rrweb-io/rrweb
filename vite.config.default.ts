/// <reference types="vite/client" />
import dts from 'vite-plugin-dts';
import { copyFileSync } from 'node:fs';
import { defineConfig, LibraryOptions, LibraryFormats, Plugin } from 'vite';
import glob from 'fast-glob';
import { build, Format } from 'esbuild';
import { resolve } from 'path';
import { umdWrapper } from 'esbuild-plugin-umd-wrapper';

const emptyOutDir = process.env.CLEAR_DIST_DIR !== 'false';

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
      ...plugins,
    ],
  }));
}
