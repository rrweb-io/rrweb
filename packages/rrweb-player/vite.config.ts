import path from 'path';
import config from '../../vite.config.default';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import sveltePreprocess from 'svelte-preprocess';

export default config(path.resolve(__dirname, 'src/main.ts'), 'rrwebPlayer', {
  plugins: [
    svelte({
      preprocess: [sveltePreprocess({ typescript: true })],
    }),
  ],
});
