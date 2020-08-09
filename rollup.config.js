import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import livereload from 'rollup-plugin-livereload';
import { terser } from 'rollup-plugin-terser';
import sveltePreprocess from 'svelte-preprocess';
import typescript from '@rollup/plugin-typescript';
import pkg from './package.json';

// eslint-disable-next-line no-undef
const production = !process.env.ROLLUP_WATCH;

const entries = (production
  ? [
      { file: pkg.module, format: 'es' },
      { file: pkg.main, format: 'cjs' },
      { file: pkg.unpkg, format: 'iife', name: 'rrwebPlayer' },
    ]
  : []
).concat([{ file: 'public/bundle.js', format: 'iife', name: 'rrwebPlayer' }]);

export default entries.map((output) => ({
  input: 'src/main.ts',
  output,
  plugins: [
    svelte({
      // enable run-time checks when not in production
      dev: !production,
      // we'll extract any component CSS out into
      // a separate file — better for performance
      css: (css) => {
        css.write('dist/style.css');
        css.write('public/bundle.css');
      },
      preprocess: sveltePreprocess({
        postcss: {
          // eslint-disable-next-line no-undef
          plugins: [require('postcss-easy-import')],
        },
      }),
    }),

    // If you have external dependencies installed from
    // npm, you'll most likely need these plugins. In
    // some cases you'll need additional configuration —
    // consult the documentation for details:
    // https://github.com/rollup/rollup-plugin-commonjs
    resolve({
      browser: true,
      dedupe: ['svelte'],
    }),
    commonjs(),

    typescript({ sourceMap: !production }),

    // In dev mode, call `npm run start` once
    // the bundle has been generated
    !production && serve(),

    // Watch the `public` directory and refresh the
    // browser on changes when not in production
    !production && livereload('public'),

    // If we're building for production (npm run build
    // instead of npm run dev), minify
    production && terser(),
  ],
  watch: {
    clearScreen: false,
  },
}));

function serve() {
  let started = false;

  return {
    writeBundle() {
      if (!started) {
        started = true;

        // eslint-disable-next-line @typescript-eslint/no-var-requires, no-undef
        require('child_process').spawn('npm', ['run', 'start', '--', '--dev'], {
          stdio: ['ignore', 'inherit', 'inherit'],
          shell: true,
        });
      }
    },
  };
}
